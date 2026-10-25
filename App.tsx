import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  StatusBar,
  Modal,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
  Alert,
  Share,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import type { Session } from "@supabase/supabase-js";
import { AuthScreen } from "./components/AuthScreen";
import { ApiError, classVaultApi, type ApiGroup, type ApiMaterial, type ApiMessage } from "./lib/api";
import { supabase } from "./lib/supabase";

type Role = "Student" | "Rep" | "Staff";
type MaterialType = "PDF" | "PPT" | "YouTube" | "Zoom" | "Text";
type Tab = "My Classes" | "Recent" | "Important";
type GroupType = "Subject Group" | "Class Group" | "General Group";
type GroupManagementView = "menu" | "create" | "invite" | "join";
type SupabaseStatus =
  | { state: "checking" }
  | { state: "connected" }
  | { state: "error"; message: string };

type Message = {
  id: string;
  author: string;
  role: Role;
  text: string;
  createdAt: string;
  expiresAt: string;
  isPinned?: boolean;
  isImportant?: boolean;
  preservedBy?: string;
};

type Material = {
  id: string;
  title: string;
  type: MaterialType;
  url: string;
  uploadedBy: string;
  postedAt: string;
  semesterRetention: string;
};

type Group = {
  id: string;
  name: string;
  code: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  description: string;
  summary: string;
  memberCount: number;
  repNames: string[];
  staffNames: string[];
  shortCode?: string;
  subjectCode?: string | null;
  facultyName?: string | null;
  groupType?: string;
  inviteLink: string;
  messages: Message[];
  materials: Material[];
  members?: { name: string; role: Role }[];
  currentRole?: Role;
};

type TimetableDay = 1 | 2 | 3 | 4 | 5 | 6;
type DailyTimetable = [string | null, string | null, string | null, string | null, string | null];

type TimetableCourse = {
  id: string;
  shortCode: string;
  name: string;
  subjectCode: string | null;
  facultyName: string;
};

const timetableDays: TimetableDay[] = [1, 2, 3, 4, 5, 6];

const timetablePeriods = [
  { number: "I", start: "9:00 AM", end: "9:50 AM" },
  { number: "II", start: "9:50 AM", end: "10:40 AM" },
  { number: "III", start: "11:00 AM", end: "11:50 AM" },
  { number: "IV", start: "11:50 AM", end: "12:40 PM" },
  { number: "V", start: "12:40 PM", end: "1:30 PM" },
] as const;

const timetableCourses: TimetableCourse[] = [
  { id: "english", name: "English", shortCode: "ENG", subjectCode: "23ELGE3", facultyName: "Mr. Praveen Kumar Sri" },
  { id: "cab", name: "Computer Application in Business", shortCode: "CAB", subjectCode: "22SCCACAOB2", facultyName: "Ms. Ishwarya" },
  { id: "python", name: "Programming in Python", shortCode: "PYTHON", subjectCode: "22SCCCA3", facultyName: "Mr. M. Sulthan Alavudeen" },
  { id: "python-lab", name: "Programming in Python Lab", shortCode: "PYTHON LAB", subjectCode: "22SCCCA3P", facultyName: "Mr. M. Sulthan Alavudeen" },
  { id: "accountancy", name: "Principles of Accountancy", shortCode: "ACC", subjectCode: "22SCCACAOB1", facultyName: "Ms. D. Kanaga Durga Devi" },
  { id: "tamil", name: "Tamil / Tamizhaga Varalarum Panbadum", shortCode: "TAM", subjectCode: "23LCGT3", facultyName: "Dr. N. Kalyani" },
  { id: "nme", name: "NME – E-Commerce", shortCode: "NME", subjectCode: "22SNMEVC1", facultyName: "Mr. S. P. Kirthivasan" },
  { id: "professional-english", name: "Professional English for Physical Science-II", shortCode: "PE", subjectCode: "22PELPS2", facultyName: "Dr. A. Devi" },
  { id: "cdc", name: "CDC", shortCode: "CDC", subjectCode: null, facultyName: "CDC Staff" },
];

const timetableRows: Record<TimetableDay, DailyTimetable> = {
  1: ["english", "cab", "python", "python-lab", "python-lab"],
  2: ["cdc", "cdc", "accountancy", "tamil", "professional-english"],
  3: ["accountancy", "english", "tamil", "python", "english"],
  4: ["python-lab", "python-lab", "nme", "accountancy", "tamil"],
  5: ["tamil", "python", "nme", "english", "python"],
  6: ["professional-english", "accountancy", "english", "tamil", "python"],
};

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const groupColors = ["#438BFF", "#9A5BFF", "#11B89A", "#F05D9B", "#EF7445", "#7557FF"];

const groupIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  book: "book",
  laptop: "laptop",
  "code-slash": "code-slash",
  flask: "flask",
  calculator: "calculator",
  library: "library",
  cart: "cart",
  chatbubbles: "chatbubbles",
  people: "people",
};

function displayProfile(profile: ApiMessage["profiles"] | ApiMaterial["profiles"]) {
  const value = Array.isArray(profile) ? profile[0] : profile;
  return value?.display_name ?? "ClassVault member";
}

function formatTimestamp(value: string | null) {
  if (!value) return "No expiry";
  return new Date(value).toLocaleString();
}

function toMessage(message: ApiMessage): Message {
  const preservedProfile = message.preserved_profile;
  return {
    id: message.id,
    author: displayProfile(message.profiles),
    role: message.author_role === "rep" ? "Rep" : message.author_role === "staff" ? "Staff" : "Student",
    text: message.body,
    createdAt: formatTimestamp(message.created_at),
    expiresAt: formatTimestamp(message.expires_at),
    isPinned: message.is_pinned,
    isImportant: message.is_important,
    preservedBy: message.preserved_at ? displayProfile(preservedProfile) : undefined,
  };
}

function toMaterial(material: ApiMaterial): Material {
  const type = material.material_type === "text" ? "Text" : material.material_type.toUpperCase();
  return {
    id: material.id,
    title: material.title,
    type: type as MaterialType,
    url: material.url,
    uploadedBy: displayProfile(material.profiles),
    postedAt: formatTimestamp(material.posted_at),
    semesterRetention: material.retention_label ?? "Until removed",
  };
}

function toGroup(group: ApiGroup, userId: string): Group {
  const members = group.group_members ?? [];
  const reps = members
    .filter((member) => member.role === "rep")
    .map((member) => (Array.isArray(member.profiles) ? member.profiles[0]?.display_name : member.profiles?.display_name) ?? "Rep");
  const staff = members
    .filter((member) => member.role === "staff")
    .map((member) => (Array.isArray(member.profiles) ? member.profiles[0]?.display_name : member.profiles?.display_name) ?? "Staff");
  const groupType =
    group.group_type === "subject"
      ? "Subject Group"
      : group.group_type === "class"
        ? "Class Group"
        : "General Group";

  return {
    id: group.id,
    name: group.name,
    code: group.subject_code ?? group.short_code ?? groupType,
    icon: groupIcons[group.icon_key ?? ""] ?? "people",
    color: group.color_hex ?? groupColors[group.name.length % groupColors.length],
    description: group.description ?? "",
    summary: group.summary ?? groupType,
    memberCount: members.length,
    repNames: reps,
    staffNames: staff,
    shortCode: group.short_code ?? undefined,
    subjectCode: group.subject_code,
    facultyName: group.faculty_name,
    groupType,
    inviteLink: "",
    messages: [],
    materials: [],
    members: members.map((member) => ({
      name: (Array.isArray(member.profiles) ? member.profiles[0]?.display_name : member.profiles?.display_name) ?? "ClassVault member",
      role: member.role === "rep" ? "Rep" : member.role === "staff" ? "Staff" : "Student",
    })),
    currentRole: (() => {
      const role = members.find((member) => member.user_id === userId)?.role;
      return role === "rep" ? "Rep" : role === "staff" ? "Staff" : "Student";
    })(),
  };
}

const light = {
  bg: "#F5F7FF",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  text: "#172344",
  muted: "#7180A3",
  border: "#E3E9F7",
  search: "#EEF2FC",
  nav: "#FFFFFF",
  subcard: "#F0F4FF",
  accent: "#7557FF",
  success: "#12C99A",
  shadow: {
    shadowColor: "#172344",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
};

const dark = {
  bg: "#071329",
  surface: "#0D1A35",
  card: "#0C1932",
  text: "#F4F6FF",
  muted: "#9BACD2",
  border: "#1B3157",
  search: "#102142",
  nav: "#071329",
  subcard: "#13264A",
  accent: "#8D7BFF",
  success: "#2CE5A7",
  shadow: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 0,
  },
};

function getMaterialTone(type: MaterialType, isDark: boolean) {
  if (isDark) {
    switch (type) {
      case "PDF":
        return { bg: "#3B242B", text: "#FFB4AB" };
      case "PPT":
        return { bg: "#392F1C", text: "#FFD18A" };
      case "YouTube":
        return { bg: "#3A2230", text: "#FF9DB8" };
      case "Zoom":
        return { bg: "#1D2E48", text: "#A9CCFF" };
      default:
        return { bg: "#18352E", text: "#8DE4B8" };
    }
  }

  switch (type) {
    case "PDF":
      return { bg: "#FDE8E8", text: "#C33B37" };
    case "PPT":
      return { bg: "#FFF1D8", text: "#B8751E" };
    case "YouTube":
      return { bg: "#FDE1EB", text: "#C6286C" };
    case "Zoom":
      return { bg: "#E3F1FF", text: "#2767D2" };
    default:
      return { bg: "#E4F8EE", text: "#0E8C65" };
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ClassVaultApp />
    </SafeAreaProvider>
  );
}

function ClassVaultApp() {
  const [isDark, setIsDark] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus>({ state: "checking" });
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeScreen, setActiveScreen] = useState<"Home" | "Classes">("Home");
  const [selectedDay, setSelectedDay] = useState<TimetableDay>(1);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("My Classes");
  const [groupList, setGroupList] = useState<Group[]>([]);
  const [activityMessages, setActivityMessages] = useState<(ApiMessage & { groupName: string; groupColor: string })[]>([]);
  const [recentMaterials, setRecentMaterials] = useState<(ApiMaterial & { groupName: string })[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const [groupManagementView, setGroupManagementView] = useState<GroupManagementView | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupType, setNewGroupType] = useState<GroupType>("Subject Group");
  const [inviteGroupId, setInviteGroupId] = useState<string | null>(null);
  const [joinValue, setJoinValue] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [managementBusy, setManagementBusy] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const c = isDark ? dark : light;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 390 || height < 700;

  useEffect(() => {
    if (!supabase) {
      setSupabaseStatus({ state: "error", message: "Supabase env vars are missing." });
      setAuthReady(true);
      return;
    }

    let isMounted = true;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession);
        setAuthReady(true);
      }
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        setSupabaseStatus({ state: "error", message: error.message });
      } else {
        setSession(data.session);
        setSupabaseStatus({ state: "connected" });
      }
      setAuthReady(true);
    }).catch((error: unknown) => {
      if (isMounted) {
        setSupabaseStatus({ state: "error", message: error instanceof Error ? error.message : String(error) });
        setAuthReady(true);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const accessToken = session?.access_token;
    if (!accessToken) {
      setGroupList([]);
      setActivityMessages([]);
      setRecentMaterials([]);
      setGroupsLoading(false);
      return;
    }

    let isMounted = true;
    setGroupsLoading(true);
    setApiError(null);
    Promise.all([classVaultApi.getGroups(accessToken), classVaultApi.getActivity(accessToken)])
      .then(([groupResponse, activity]) => {
        if (!isMounted) return;
        const nextGroups = groupResponse.groups.map((group) => toGroup(group, session.user.id));
        const names = new Map(nextGroups.map((group) => [group.id, group]));
        setGroupList(nextGroups);
        setActivityMessages(
          activity.messages.map((message) => ({
            ...message,
            groupName: names.get(message.group_id)?.name ?? "Group",
            groupColor: names.get(message.group_id)?.color ?? "#7557FF",
          }))
        );
        setRecentMaterials(
          activity.materials.map((material) => ({
            ...material,
            groupName: names.get(material.group_id)?.name ?? "Group",
          }))
        );
        setSupabaseStatus({ state: "connected" });
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setApiError(error instanceof ApiError ? error.message : error instanceof Error ? error.message : String(error));
          setSupabaseStatus({ state: "error", message: "Could not load your ClassVault data." });
        }
      })
      .finally(() => {
        if (isMounted) setGroupsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session?.access_token]);

  const lowerQuery = query.trim().toLowerCase();

  const visibleGroups = useMemo(() => {
    if (!lowerQuery) {
      return groupList;
    }

    return groupList.filter((group) => {
      const searchableText = [
        group.name,
        group.description,
        group.summary,
        group.repNames.join(" "),
        group.staffNames.join(" "),
        activityMessages.filter((message) => message.group_id === group.id).map((message) => message.body).join(" "),
        recentMaterials.filter((material) => material.group_id === group.id).map((material) => material.title).join(" "),
      ].join(" ").toLowerCase();

      return searchableText.includes(lowerQuery);
    });
  }, [activityMessages, groupList, lowerQuery, recentMaterials]);

  const recentPosts = useMemo(
    () => activityMessages.map((message) => ({
      ...toMessage(message),
      groupName: message.groupName,
      groupId: message.group_id,
      groupColor: message.groupColor,
    })),
    [activityMessages]
  );

  const importantPosts = useMemo(
    () =>
      recentPosts.filter((post) => post.isPinned || post.isImportant || post.preservedBy),
    [recentPosts]
  );

  const styles = makeStyles(c, isCompact);
  const manageableGroups = groupList.filter((group) => group.currentRole === "Rep" || group.currentRole === "Staff");
  const selectedInviteGroup = manageableGroups.find((group) => group.id === inviteGroupId) ?? null;

  if (!authReady) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg }}>
        <Text style={{ color: c.text }}>Loading your ClassVault account...</Text>
      </SafeAreaView>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  const toggleTheme = () => setIsDark((value) => !value);

  const openGroupManagement = () => {
    setGroupManagementView("menu");
  };

  const closeGroupManagement = () => {
    setGroupManagementView(null);
  };

  const reloadGroups = async () => {
    const accessToken = session?.access_token;
    if (!accessToken) return;
    setGroupsLoading(true);
    try {
      const [groupResponse, activity] = await Promise.all([
        classVaultApi.getGroups(accessToken),
        classVaultApi.getActivity(accessToken),
      ]);
      const nextGroups = groupResponse.groups.map((group) => toGroup(group, session.user.id));
      const names = new Map(nextGroups.map((group) => [group.id, group]));
      setGroupList(nextGroups);
      setActivityMessages(activity.messages.map((message) => ({
        ...message,
        groupName: names.get(message.group_id)?.name ?? "Group",
        groupColor: names.get(message.group_id)?.color ?? "#7557FF",
      })));
      setRecentMaterials(activity.materials.map((material) => ({
        ...material,
        groupName: names.get(material.group_id)?.name ?? "Group",
      })));
      setSupabaseStatus({ state: "connected" });
      setApiError(null);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : String(error));
      setSupabaseStatus({ state: "error", message: "Could not load your ClassVault data." });
      throw error;
    } finally {
      setGroupsLoading(false);
    }
  };

  const openGroup = async (group: Group) => {
    setSelectedGroup(group);
    setApiError(null);
    const accessToken = session?.access_token;
    if (!accessToken) return;
    try {
      const [messageResponse, materialResponse] = await Promise.all([
        classVaultApi.getGroupMessages(accessToken, group.id),
        classVaultApi.getGroupMaterials(accessToken, group.id),
      ]);
      const loadedGroup = {
        ...group,
        messages: messageResponse.messages.map(toMessage),
        materials: materialResponse.materials.map(toMaterial),
      };
      setSelectedGroup(loadedGroup);
      setGroupList((groups) => groups.map((item) => item.id === group.id ? loadedGroup : item));
    } catch (error) {
      setApiError(error instanceof Error ? error.message : String(error));
    }
  };

  const createGroup = async () => {
    const name = newGroupName.trim();
    if (!name) {
      Alert.alert("Group name required", "Enter a name before creating the group.");
      return;
    }
    setManagementBusy(true);
    try {
      if (!session?.access_token) throw new Error("Sign in to create a group.");
      await classVaultApi.createGroup(session.access_token, {
        name,
        groupType: newGroupType === "Subject Group" ? "subject" : newGroupType === "Class Group" ? "class" : "general",
        description: newGroupDescription.trim() || undefined,
      });
      await reloadGroups();
      setTab("My Classes");
      setQuery("");
      setNewGroupName("");
      setNewGroupDescription("");
      closeGroupManagement();
      Alert.alert("Group created", `${name} is now saved to your account.`);
    } catch (error) {
      Alert.alert("Could not create group", error instanceof Error ? error.message : String(error));
    } finally {
      setManagementBusy(false);
    }
  };

  const joinGroup = async () => {
    const enteredValue = joinValue.trim();
    const code = enteredValue.match(/[a-f0-9]{64}$/i)?.[0] ?? enteredValue;
    if (!code) {
      Alert.alert("Invite code required", "Paste a real invite code.");
      return;
    }
    setManagementBusy(true);
    try {
      if (!session?.access_token) throw new Error("Sign in to join a group.");
      await classVaultApi.joinInvite(session.access_token, code);
      await reloadGroups();
      setTab("My Classes");
      setQuery("");
      setJoinValue("");
      closeGroupManagement();
      Alert.alert("Group joined", "The shared group is now in your group list.");
    } catch (error) {
      Alert.alert("Could not join group", error instanceof Error ? error.message : String(error));
    } finally {
      setManagementBusy(false);
    }
  };

  const createGroupInvite = async () => {
    if (!selectedInviteGroup || !session?.access_token) return;
    setManagementBusy(true);
    setInviteCode(null);
    try {
      const response = await classVaultApi.createInvite(session.access_token, selectedInviteGroup.id);
      setInviteCode(response.invite.code);
    } catch (error) {
      Alert.alert("Could not create invite", error instanceof Error ? error.message : String(error));
    } finally {
      setManagementBusy(false);
    }
  };

  const sendMessage = async () => {
    const body = messageDraft.trim();
    if (!selectedGroup || !body || !session?.access_token) return;
    setMessageSending(true);
    try {
      await classVaultApi.createMessage(session.access_token, selectedGroup.id, body);
      setMessageDraft("");
      await openGroup(selectedGroup);
      await reloadGroups();
    } catch (error) {
      Alert.alert("Could not send message", error instanceof Error ? error.message : String(error));
    } finally {
      setMessageSending(false);
    }
  };

  const copyInviteLink = async (inviteLink: string) => {
    try {
      await Clipboard.setStringAsync(inviteLink);
      Alert.alert("Copied", "Invite code copied.");
    } catch (error) {
      Alert.alert("Copy failed", error instanceof Error ? error.message : "Could not copy the sample link.");
    }
  };

  const shareInviteLink = async (group: Group) => {
    if (!inviteCode) return;
    try {
      await Share.share({
        title: `Invite to ${group.name}`,
        message: `Join ${group.name} on ClassVault with invite code: ${inviteCode}`,
      });
    } catch (error) {
      Alert.alert("Share failed", error instanceof Error ? error.message : "Could not share the sample link.");
    }
  };

  const renderGroupCard = (group: Group) => (
    <Pressable key={group.id} style={styles.subjectCard} onPress={() => void openGroup(group)}>
      <View style={[styles.subjectIcon, { backgroundColor: group.color }]}>
        <Ionicons name={group.icon} size={24} color="#FFFFFF" />
      </View>
      <View style={styles.subjectInfo}>
        <View style={styles.subjectTitleRow}>
          <Text style={styles.subjectName} numberOfLines={2}>{group.name}</Text>
          <Text style={styles.subjectShortCode}>{group.shortCode ?? "GROUP"}</Text>
        </View>
        <Text style={styles.subjectCode}>Code: {group.subjectCode ?? "Not provided"}</Text>
        <Text style={styles.subjectFaculty} numberOfLines={1}>{group.facultyName ?? "Faculty not provided"}</Text>
        <Text style={styles.subjectType}>{group.groupType ?? group.summary}</Text>
      </View>
      <View style={styles.subjectRight}>
        {group.memberCount > 0 && <Text style={styles.time}>{group.memberCount} members</Text>}
        <Ionicons name="chevron-forward" size={16} color={c.muted} />
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logo}><Ionicons name="school" size={25} color="#FFFFFF" /></View>
            <View>
              <Text style={styles.brand}>ClassVault</Text>
              <Text style={styles.tagline}>Learn • Connect • Grow</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.iconButton}
              onPress={toggleTheme}
              accessibilityRole="button"
              accessibilityLabel={isDark ? "Dark theme active. Switch to light mode" : "Light theme active. Switch to dark mode"}
            >
              <Ionicons name={isDark ? "moon" : "sunny"} size={21} color={c.accent} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => setShowNotifications(true)} accessibilityLabel="Notifications">
              <Ionicons name="notifications-outline" size={22} color={c.text} />
            </Pressable>
            <Pressable style={styles.avatar} onPress={() => setShowProfile(true)}>
              <Ionicons name="person" size={19} color={c.text} />
            </Pressable>
          </View>
        </View>

        <View
          style={{
            marginHorizontal: 20,
            marginTop: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
            backgroundColor: supabaseStatus.state === "connected" ? "#E6F7EE" : "#FFF3E0",
          }}
        >
          <Text
            style={{
              color: supabaseStatus.state === "connected" ? "#137A45" : "#8A5200",
              fontSize: 12,
            }}
          >
            {groupsLoading
              ? "Loading your groups and class activity..."
              : supabaseStatus.state === "connected"
                ? `Signed in as ${session.user.email ?? "ClassVault user"} • Live data`
                : `Connection issue: ${apiError ?? (supabaseStatus.state === "error" ? supabaseStatus.message : "Connecting...")}`}
          </Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {activeScreen === "Classes" ? (
            <>
              <View style={styles.timetableHeading}>
                <View style={styles.timetableHeadingIcon}>
                  <Ionicons name="calendar" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.timetableHeadingText}>
                  <Text style={styles.timetableTitle}>Class timetable</Text>
                  <Text style={styles.timetableSubtitle}>II BCA • Odd Semester 2026–2027</Text>
                </View>
              </View>
              <View style={styles.rotationNote}>
                <Ionicons name="information-circle-outline" size={17} color={c.accent} />
                <Text style={styles.rotationNoteText}>
                  Select the rotating timetable day manually. It is not tied to the weekday.
                </Text>
              </View>
              <View style={styles.daySelector}>
                {timetableDays.map((day) => (
                  <Pressable
                    key={day}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedDay === day }}
                    accessibilityLabel={`Select timetable Day ${day}`}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setSelectedDay(day);
                    }}
                    style={[
                      styles.dayOption,
                      selectedDay === day && styles.dayOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayOptionLabel,
                        selectedDay === day && styles.dayOptionLabelActive,
                      ]}
                    >
                      Day {day}
                    </Text>
                    {selectedDay === day && <View style={styles.dayActiveIndicator} />}
                  </Pressable>
                ))}
              </View>
              <View style={styles.selectedDayHeading}>
                <View>
                  <Text style={styles.selectedDayTitle}>Day {selectedDay}</Text>
                  <Text style={styles.selectedDayHint}>Five teaching periods</Text>
                </View>
                <View style={styles.manualBadge}>
                  <Ionicons name="hand-left-outline" size={13} color={c.accent} />
                  <Text style={styles.manualBadgeText}>Manual selection</Text>
                </View>
              </View>
              <View style={styles.scheduleList}>
                {timetablePeriods.map((period, index) => {
                  const subjectId = timetableRows[selectedDay][index];
                  const subject = subjectId
                    ? timetableCourses.find((course) => course.id === subjectId)
                    : undefined;
                  return (
                    <React.Fragment key={period.number}>
                      {index === 2 && (
                        <View style={styles.breakRow}>
                          <View style={styles.breakLine} />
                          <View style={styles.breakPill}>
                            <Ionicons name="cafe-outline" size={14} color={c.accent} />
                            <Text style={styles.breakText}>Break</Text>
                            <Text style={styles.breakTime}>10:40 AM – 11:00 AM</Text>
                          </View>
                          <View style={styles.breakLine} />
                        </View>
                      )}
                      <View style={styles.periodCard}>
                        <View style={styles.periodTimeline}>
                          <Text style={styles.periodNumber}>Period {period.number}</Text>
                          <Text style={styles.periodTime}>{period.start} – {period.end}</Text>
                        </View>
                        <View style={styles.periodDivider} />
                        <View style={styles.periodContent}>
                          {subject && (
                            <>
                              <Text style={styles.periodSubject} numberOfLines={2}>
                                {subject.name}
                              </Text>
                              <Text style={styles.periodCode}>
                                Subject code: {subject.subjectCode ?? "Not provided"}
                              </Text>
                              <Text style={styles.periodFaculty}>{subject.facultyName}</Text>
                            </>
                          )}
                        </View>
                      </View>
                    </React.Fragment>
                  );
                })}
              </View>
            </>
          ) : (
            <>
          <View style={styles.collegeCard}>
            <View style={styles.collegeIcon}><Ionicons name="business" size={27} color="#FFFFFF" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.collegeName}>Your ClassVault groups</Text>
              <Text style={styles.collegeCourse}>{session.user.email}</Text>
              <Text style={styles.collegeMeta}>{groupList.length} groups available</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.muted} />
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={19} color={c.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search groups, messages, or materials"
                placeholderTextColor={c.muted}
                style={styles.searchInput}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={18} color={c.muted} />
                </Pressable>
              )}
            </View>
            <Pressable style={styles.filterButton} onPress={openGroupManagement} accessibilityLabel="Open group management menu">
              <Ionicons name="options-outline" size={21} color={c.text} />
            </Pressable>
          </View>

          <View style={styles.tabs}>
            {(["My Classes", "Recent", "Important"] as const).map((item) => (
              <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.activeTab]}>
                <Text style={[styles.tabText, tab === item && styles.activeTabText]}>{item}</Text>
                {item === "Important" && <View style={styles.tinyDot} />}
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>{tab === "My Classes" ? "Your subject groups" : tab}</Text>
            <Text style={styles.count}>{visibleGroups.length} groups</Text>
          </View>

          {tab === "My Classes" && visibleGroups.map(renderGroupCard)}
          {!groupsLoading && tab === "My Classes" && visibleGroups.length === 0 && (
            <Text style={styles.empty}>No groups yet. Create a group or join one with an invite code.</Text>
          )}
          {tab === "Recent" && (
            <View style={styles.feedList}>
              {recentPosts.slice(0, 4).map((post) => (
                <Pressable key={post.id} style={styles.feedCard} onPress={() => { const group = groupList.find((item) => item.id === post.groupId); if (group) void openGroup(group); }}>
                  <View style={[styles.feedTag, { backgroundColor: post.groupColor }]}>
                    <Text style={styles.feedTagText}>{post.groupName}</Text>
                  </View>
                  <Text style={styles.feedAuthor}>{post.author}</Text>
                  <Text style={styles.feedText}>{post.text}</Text>
                  <Text style={styles.feedMeta}>{post.createdAt}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {tab === "Important" && (
            <View style={styles.feedList}>
              {importantPosts.slice(0, 4).map((post) => (
                <Pressable key={post.id} style={styles.feedCard} onPress={() => { const group = groupList.find((item) => item.id === post.groupId); if (group) void openGroup(group); }}>
                  <View style={[styles.feedTag, { backgroundColor: post.groupColor }]}>
                    <Text style={styles.feedTagText}>{post.groupName}</Text>
                  </View>
                  <Text style={styles.feedAuthor}>{post.author} • {post.role}</Text>
                  <Text style={styles.feedText}>{post.text}</Text>
                  <Text style={styles.feedMeta}>{post.isPinned ? "Pinned" : post.isImportant ? "Important" : "Preserved"} • {post.createdAt}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {query.trim().length > 0 && visibleGroups.length === 0 && <Text style={styles.empty}>No groups match your search.</Text>}

          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Recently shared materials</Text>
            <Text style={styles.count}>{recentMaterials.length} items</Text>
          </View>

          <View style={styles.miniMaterialsList}>
            {recentMaterials.map((material) => {
              const type = material.material_type.toUpperCase() as MaterialType;
              const tones = getMaterialTone(type, isDark);
              return (
                <Pressable key={material.id} style={styles.materialMini} onPress={() => Linking.openURL(material.url)}>
                  <View style={[styles.materialBadge, { backgroundColor: tones.bg }]}>
                    <Text style={[styles.materialBadgeText, { color: tones.text }]}>{type}</Text>
                  </View>
                  <View style={styles.materialMiniTextWrap}>
                    <Text style={styles.materialMiniTitle}>{material.title}</Text>
                    <Text style={styles.materialMiniMeta}>{material.groupName} • {displayProfile(material.profiles)}</Text>
                  </View>
                </Pressable>
              );
            })}
            {!groupsLoading && recentMaterials.length === 0 && <Text style={styles.empty}>No materials have been shared yet.</Text>}
          </View>

          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={18} color={c.muted} />
            <Text style={styles.noteText}>
              Group, message, and material data are loaded from your account. Rep and staff permissions are enforced by the backend.
            </Text>
          </View>
            </>
          )}
        </ScrollView>

        <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {[
            { label: "Home", icon: "home" as const },
            { label: "Classes", icon: "people" as const },
            { label: "Files", icon: "folder-open" as const },
            { label: "Chat", icon: "chatbubble-ellipses" as const },
            { label: "Profile", icon: "person" as const },
          ].map((item) => (
            <Pressable
              key={item.label}
              style={styles.navItem}
              onPress={() => {
                if (item.label === "Profile") {
                  setShowProfile(true);
                } else if (item.label === "Home" || item.label === "Classes") {
                  setActiveScreen(item.label);
                }
              }}
            >
              <Ionicons name={item.icon} size={21} color={item.label === activeScreen ? c.accent : c.muted} />
              <Text style={[styles.navLabel, item.label === activeScreen && styles.navActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Modal visible={!!selectedGroup} transparent animationType="slide" onRequestClose={() => setSelectedGroup(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Pressable style={styles.modalClose} onPress={() => setSelectedGroup(null)}>
              <Ionicons name="close" size={23} color={c.text} />
            </Pressable>
            {selectedGroup && (
              <>
                <View style={[styles.subjectIcon, { backgroundColor: selectedGroup.color, alignSelf: "center", width: 62, height: 62, borderRadius: 20 }]}>
                  <Ionicons name={selectedGroup.icon} size={30} color="#FFFFFF" />
                </View>
                <Text style={styles.modalTitle}>{selectedGroup.name}</Text>
                <Text style={styles.modalSubtitle}>{selectedGroup.description}</Text>
                {!!apiError && <Text style={{ color: "#BA2525", fontSize: 12, marginTop: 8 }}>{apiError}</Text>}

                <Pressable
                  style={styles.actionBar}
                  onPress={() => {
                    if (selectedGroup.currentRole === "Student") {
                      Alert.alert("Rep or staff only", "Ask a group rep or staff member to create an invite.");
                      return;
                    }
                    setInviteGroupId(selectedGroup.id);
                    setInviteCode(null);
                    setSelectedGroup(null);
                    setGroupManagementView("invite");
                  }}
                >
                  <Ionicons name="link-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.actionBarText}>
                    {selectedGroup.currentRole === "Student" ? "Invite (ask a rep or staff)" : "Create invite code"}
                  </Text>
                </Pressable>

                <View style={styles.groupStats}>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{selectedGroup.memberCount}</Text>
                    <Text style={styles.statLabel}>Members</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{selectedGroup.repNames.length}</Text>
                    <Text style={styles.statLabel}>Rep</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{selectedGroup.staffNames.length}</Text>
                    <Text style={styles.statLabel}>Staff</Text>
                  </View>
                </View>

                <Text style={styles.membersHeading}>Members and roles</Text>
                {(selectedGroup.members ?? []).map((member, index) => (
                  <View key={`${member.name}-${index}`} style={styles.memberRow}>
                    <View style={styles.memberAvatar}>
                      <Ionicons name="person" size={17} color={c.text} />
                    </View>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.role}>{member.role.toUpperCase()}</Text>
                  </View>
                ))}
                {(selectedGroup.members ?? []).length === 0 && (
                  <Text style={styles.empty}>Member details are not available.</Text>
                )}

                <Text style={styles.membersHeading}>Materials</Text>
                {selectedGroup.materials.map((material) => {
                  const tones = getMaterialTone(material.type, isDark);
                  return (
                    <Pressable key={material.id} style={styles.materialCard} onPress={() => Linking.openURL(material.url)}>
                      <View style={[styles.materialChip, { backgroundColor: tones.bg }]}>
                        <Text style={[styles.materialChipText, { color: tones.text }]}>{material.type}</Text>
                      </View>
                      <Text style={styles.materialTitle}>{material.title}</Text>
                      <Text style={styles.materialMeta}>Uploaded by {material.uploadedBy}</Text>
                      <Text style={styles.materialMeta}>Retention: {material.semesterRetention}</Text>
                    </Pressable>
                  );
                })}

                <Text style={styles.membersHeading}>Recent activity and retention</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <TextInput
                    value={messageDraft}
                    onChangeText={setMessageDraft}
                    placeholder="Write a message"
                    placeholderTextColor={c.muted}
                    style={[styles.managementInput, { flex: 1, marginBottom: 0 }]}
                    maxLength={5000}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Send message"
                    disabled={!messageDraft.trim() || messageSending}
                    onPress={() => void sendMessage()}
                    style={[styles.actionBar, { marginTop: 0, paddingHorizontal: 14, opacity: !messageDraft.trim() || messageSending ? 0.55 : 1 }]}
                  >
                    <Ionicons name="send" size={17} color="#FFFFFF" />
                  </Pressable>
                </View>
                {selectedGroup.messages.map((message) => (
                  <View key={message.id} style={styles.messageCard}>
                    <View style={styles.messageLine}>
                      <Text style={styles.messageName}>{message.author}</Text>
                      <Text style={styles.messageRole}>{message.role}</Text>
                    </View>
                    <Text style={styles.messageText}>{message.text}</Text>
                    <View style={styles.messageFlags}>
                      {(message.isPinned || message.isImportant || message.preservedBy) && (
                        <Text style={styles.flagPill}>{message.isPinned ? "Pinned" : message.isImportant ? "Important" : "Preserved"}</Text>
                      )}
                      <Text style={styles.messageMeta}>{message.createdAt}</Text>
                    </View>
                    <Text style={styles.messageMeta}>
                      {message.preservedBy ? `Preserved by ${message.preservedBy}` : `Default student message expiry: ${message.expiresAt}`}
                    </Text>
                  </View>
                ))}

                <Text style={styles.modalFootnote}>
                  Student messages expire after 24 hours. Messages and permissions are managed by the ClassVault API.
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showNotifications} transparent animationType="fade" onRequestClose={() => setShowNotifications(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.profileSheet}>
            <Pressable style={styles.modalClose} onPress={() => setShowNotifications(false)}>
              <Ionicons name="close" size={23} color={c.text} />
            </Pressable>
            <View style={styles.profileIcon}><Ionicons name="notifications" size={30} color="#7557FF" /></View>
            <Text style={styles.modalTitle}>Notifications</Text>
            <Text style={styles.modalSubtitle}>Recent activity in your groups</Text>
            <View style={styles.notificationList}>
              {activityMessages.slice(0, 10).map((item) => (
                <View key={item.id} style={styles.notificationItem}>
                  <View style={styles.notificationDotLarge} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notificationTitle}>{item.groupName} • {displayProfile(item.profiles)}</Text>
                    <Text style={styles.notificationBody}>{item.body}</Text>
                  </View>
                </View>
              ))}
              {activityMessages.length === 0 && <Text style={styles.empty}>No recent group activity.</Text>}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showProfile} transparent animationType="fade" onRequestClose={() => setShowProfile(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.profileSheet}>
            <Pressable style={styles.modalClose} onPress={() => setShowProfile(false)}>
              <Ionicons name="close" size={23} color={c.text} />
            </Pressable>
            <View style={styles.profileIcon}><Ionicons name="person" size={30} color="#7557FF" /></View>
            <Text style={styles.modalTitle}>Profile & settings</Text>
            <Text style={styles.modalSubtitle}>{session.user.email ?? "ClassVault account"}</Text>

            <Pressable style={styles.primaryButton} onPress={() => { setShowProfile(false); toggleTheme(); }}>
              <Ionicons name={isDark ? "moon" : "sunny"} size={19} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                {isDark ? "Dark mode · Switch to Light" : "Light mode · Switch to Dark"}
              </Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={() => { setShowProfile(false); setShowNotifications(true); }}>
              <Ionicons name="notifications-outline" size={18} color={c.text} />
              <Text style={styles.secondaryButtonText}>Open notifications</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                setShowProfile(false);
                void supabase?.auth.signOut().then(({ error }) => {
                  if (error) Alert.alert("Could not sign out", error.message);
                });
              }}
            >
              <Ionicons name="log-out-outline" size={18} color={c.text} />
              <Text style={styles.secondaryButtonText}>Sign out</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={groupManagementView !== null}
        transparent
        animationType="slide"
        onRequestClose={closeGroupManagement}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, styles.managementSheet, { paddingBottom: Math.max(insets.bottom + 18, 30) }]}>
            <View style={styles.modalHandle} />
            <View style={styles.managementHeader}>
              <Pressable
                style={styles.managementHeaderButton}
                onPress={() => {
                  if (groupManagementView === "menu") {
                    closeGroupManagement();
                  } else {
                    setGroupManagementView("menu");
                  }
                }}
                accessibilityLabel={groupManagementView === "menu" ? "Close group menu" : "Back to group menu"}
              >
                <Ionicons name={groupManagementView === "menu" ? "chevron-down" : "arrow-back"} size={20} color={c.text} />
              </Pressable>
              <Text style={styles.managementTitle}>
                {groupManagementView === "menu"
                  ? "Group management"
                  : groupManagementView === "create"
                    ? "Create a Group"
                    : groupManagementView === "invite"
                      ? "Invite Group Link"
                      : "Join a Group"}
              </Text>
              <Pressable style={styles.managementHeaderButton} onPress={closeGroupManagement} accessibilityLabel="Close">
                <Ionicons name="close" size={20} color={c.text} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.managementScroll}
              contentContainerStyle={styles.managementContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {groupManagementView === "menu" && (
                <>
                  <Text style={styles.managementSubtitle}>Choose what you want to do with your groups.</Text>
                  <Pressable style={styles.managementOption} onPress={() => setGroupManagementView("create")}>
                    <View style={[styles.managementOptionIcon, { backgroundColor: "#7557FF" }]}>
                      <MaterialCommunityIcons name="account-multiple-plus-outline" size={21} color="#FFFFFF" />
                    </View>
                    <View style={styles.managementOptionText}>
                      <Text style={styles.managementOptionTitle}>Create a Group</Text>
                      <Text style={styles.managementOptionDescription}>Create a group saved to your account</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={c.muted} />
                  </Pressable>
                  <Pressable
                    style={styles.managementOption}
                    onPress={() => {
                      setInviteGroupId(manageableGroups[0]?.id ?? null);
                      setInviteCode(null);
                      setGroupManagementView("invite");
                    }}
                  >
                    <View style={[styles.managementOptionIcon, { backgroundColor: "#2378D4" }]}>
                      <Ionicons name="link" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.managementOptionText}>
                      <Text style={styles.managementOptionTitle}>Invite Group Link</Text>
                      <Text style={styles.managementOptionDescription}>Generate an expiring invite code</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={c.muted} />
                  </Pressable>
                  <Pressable style={styles.managementOption} onPress={() => setGroupManagementView("join")}>
                    <View style={[styles.managementOptionIcon, { backgroundColor: "#11A985" }]}>
                      <MaterialCommunityIcons name="account-plus-outline" size={21} color="#FFFFFF" />
                    </View>
                    <View style={styles.managementOptionText}>
                      <Text style={styles.managementOptionTitle}>Join a Group</Text>
                      <Text style={styles.managementOptionDescription}>Try joining with a code or link</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={c.muted} />
                  </Pressable>
                  <Text style={styles.managementDemoNote}>Groups and invite codes are stored and validated by the backend.</Text>
                </>
              )}

              {groupManagementView === "create" && (
                <>
                  <Text style={styles.managementSubtitle}>Create a group that is shared with your account.</Text>
                  <Text style={styles.inputLabel}>Group Name *</Text>
                  <TextInput
                    value={newGroupName}
                    onChangeText={setNewGroupName}
                    placeholder="e.g. BCA Study Circle"
                    placeholderTextColor={c.muted}
                    style={styles.managementInput}
                    maxLength={60}
                    returnKeyType="next"
                  />
                  <Text style={styles.inputLabel}>Group Description</Text>
                  <TextInput
                    value={newGroupDescription}
                    onChangeText={setNewGroupDescription}
                    placeholder="What is this group for?"
                    placeholderTextColor={c.muted}
                    style={[styles.managementInput, styles.descriptionInput]}
                    multiline
                    maxLength={180}
                    textAlignVertical="top"
                  />
                  <Text style={styles.inputLabel}>Group Type</Text>
                  <View style={styles.groupTypeOptions}>
                    {(["Subject Group", "Class Group", "General Group"] as const).map((type) => (
                      <Pressable
                        key={type}
                        style={[styles.groupTypeOption, newGroupType === type && styles.groupTypeOptionActive]}
                        onPress={() => setNewGroupType(type)}
                      >
                        <Text style={[styles.groupTypeText, newGroupType === type && styles.groupTypeTextActive]}>{type}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable disabled={managementBusy} style={[styles.managementPrimaryButton, managementBusy && { opacity: 0.6 }]} onPress={() => void createGroup()}>
                    <Ionicons name="people" size={18} color="#FFFFFF" />
                    <Text style={styles.managementPrimaryText}>{managementBusy ? "Creating..." : "Create Group"}</Text>
                  </Pressable>
                  <Pressable style={styles.managementCancelButton} onPress={closeGroupManagement}>
                    <Text style={styles.managementCancelText}>Cancel</Text>
                  </Pressable>
                  <Text style={styles.managementDemoNote}>The group creator is added as its first rep.</Text>
                </>
              )}

              {groupManagementView === "invite" && (
                <>
                  <Text style={styles.managementSubtitle}>Create a secure invite code for a group you manage.</Text>
                  {manageableGroups.length === 0 ? (
                    <View style={styles.managementEmpty}>
                      <Ionicons name="people-outline" size={30} color={c.muted} />
                      <Text style={styles.managementEmptyTitle}>No groups yet</Text>
                      <Text style={styles.managementEmptyText}>You need to be a rep or staff member to create invites.</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.inviteGroupList}>
                        {manageableGroups.map((group) => (
                          <Pressable
                            key={group.id}
                            style={[styles.inviteGroupOption, inviteGroupId === group.id && styles.inviteGroupOptionActive]}
                            onPress={() => { setInviteGroupId(group.id); setInviteCode(null); }}
                          >
                            <View style={[styles.inviteGroupIcon, { backgroundColor: group.color }]}>
                              <Ionicons name={group.icon} size={16} color="#FFFFFF" />
                            </View>
                            <Text style={styles.inviteGroupName} numberOfLines={1}>{group.name}</Text>
                            {inviteGroupId === group.id && <Ionicons name="checkmark-circle" size={19} color={c.accent} />}
                          </Pressable>
                        ))}
                      </View>
                      {selectedInviteGroup && (
                        <>
                          <Text style={styles.inputLabel}>Invite code</Text>
                          <View style={styles.inviteLinkBox}>
                            <Ionicons name="link-outline" size={17} color={c.accent} />
                            <Text style={styles.inviteLinkText} selectable>
                              {inviteCode ?? "Create a code to share"}
                            </Text>
                          </View>
                          <Pressable
                            disabled={managementBusy}
                            style={[styles.managementPrimaryButton, managementBusy && { opacity: 0.6 }]}
                            onPress={() => inviteCode ? void copyInviteLink(inviteCode) : void createGroupInvite()}
                          >
                            <Ionicons name={inviteCode ? "copy-outline" : "key-outline"} size={18} color="#FFFFFF" />
                            <Text style={styles.managementPrimaryText}>
                              {managementBusy ? "Working..." : inviteCode ? "Copy Invite Code" : "Generate Invite Code"}
                            </Text>
                          </Pressable>
                          {inviteCode && <Pressable style={styles.managementCancelButton} onPress={() => void shareInviteLink(selectedInviteGroup)}>
                            <Ionicons name="share-social-outline" size={17} color={c.text} />
                            <Text style={styles.managementCancelText}>Share Invite Code</Text>
                          </Pressable>}
                        </>
                      )}
                    </>
                  )}
                  <Text style={styles.managementDemoNote}>Codes expire after 7 days. Only reps and staff can generate them.</Text>
                </>
              )}

              {groupManagementView === "join" && (
                <>
                  <Text style={styles.managementSubtitle}>Enter the invite code shared by a group rep or staff member.</Text>
                  <Text style={styles.inputLabel}>Group invite link or code</Text>
                  <TextInput
                    value={joinValue}
                    onChangeText={setJoinValue}
                    placeholder="Paste the invite code"
                    placeholderTextColor={c.muted}
                    style={styles.managementInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable disabled={managementBusy} style={[styles.managementPrimaryButton, managementBusy && { opacity: 0.6 }]} onPress={() => void joinGroup()}>
                    <Ionicons name="person-add" size={18} color="#FFFFFF" />
                    <Text style={styles.managementPrimaryText}>{managementBusy ? "Joining..." : "Join Group"}</Text>
                  </Pressable>
                  <Pressable style={styles.managementCancelButton} onPress={closeGroupManagement}>
                    <Text style={styles.managementCancelText}>Cancel</Text>
                  </Pressable>
                  <Text style={styles.managementDemoNote}>Invalid, expired, and exhausted invite codes are rejected by the backend.</Text>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(c: typeof dark, isCompact: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    page: { flex: 1, backgroundColor: c.bg },
    header: {
      backgroundColor: c.nav,
      paddingHorizontal: isCompact ? 14 : 18,
      paddingTop: isCompact ? 5 : 8,
      paddingBottom: isCompact ? 8 : 11,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    logo: { width: 33, height: 33, borderRadius: 11, backgroundColor: "#7557FF", alignItems: "center", justifyContent: "center" },
    brand: { color: c.accent, fontWeight: "800", fontSize: isCompact ? 16 : 17, letterSpacing: -0.4 },
    tagline: { color: c.muted, fontSize: 9, marginTop: 1, letterSpacing: 0.2 },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 7 },
    iconButton: { width: 31, height: 31, borderRadius: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", position: "relative" },
    notificationDot: { position: "absolute", right: 7, top: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF4D83" },
    avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.subcard, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
    scrollContent: { paddingHorizontal: isCompact ? 14 : 18, paddingBottom: 18 },
    collegeCard: { flexDirection: "row", alignItems: "center", gap: 9, padding: isCompact ? 9 : 11, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, marginBottom: 12, ...c.shadow },
    collegeIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#4E73E8", alignItems: "center", justifyContent: "center" },
    collegeName: { color: c.text, fontSize: 12, fontWeight: "800", lineHeight: 17 },
    collegeCourse: { color: c.muted, fontSize: 11, marginTop: 2 },
    collegeMeta: { color: c.accent, fontSize: 10, marginTop: 2, fontWeight: "600" },
    searchRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
    searchBox: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.search, borderRadius: 13, borderWidth: 1, borderColor: c.border, paddingHorizontal: 11, height: isCompact ? 40 : 43, ...c.shadow },
    searchInput: { flex: 1, color: c.text, fontSize: 12.5, paddingVertical: 0 },
    filterButton: { width: isCompact ? 40 : 43, height: isCompact ? 40 : 43, borderRadius: 13, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", ...c.shadow },
    tabs: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    tab: { paddingHorizontal: 6, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 4, borderBottomWidth: 2, borderBottomColor: "transparent" },
    activeTab: { borderBottomColor: c.accent },
    tabText: { color: c.muted, fontSize: 11.5, fontWeight: "600" },
    activeTabText: { color: c.accent, fontWeight: "800" },
    tinyDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#FF4D83" },
    sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    sectionTitle: { color: c.text, fontSize: 14, fontWeight: "800" },
    count: { color: c.muted, fontSize: 10 },
    subjectCard: { flexDirection: "row", alignItems: "center", gap: 9, padding: 10, borderRadius: 15, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, marginBottom: 8, minHeight: 94, ...c.shadow },
    subjectIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    subjectInfo: { flex: 1, minWidth: 0 },
    subjectTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 5 },
    subjectName: { color: c.text, fontWeight: "800", fontSize: 12, flex: 1, lineHeight: 16 },
    subjectShortCode: { color: c.accent, fontSize: 8, fontWeight: "900", backgroundColor: c.subcard, overflow: "hidden", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 3 },
    subjectCode: { color: c.muted, fontSize: 9, marginTop: 3 },
    subjectFaculty: { color: c.text, fontSize: 9, marginTop: 2, fontWeight: "600" },
    subjectType: { color: c.muted, fontSize: 8, marginTop: 2 },
    subjectRight: { alignItems: "flex-end", justifyContent: "center", gap: 4, minWidth: 35 },
    time: { color: c.muted, fontSize: 8 },
    timetableHeading: { flexDirection: "row", alignItems: "center", gap: 11, padding: 14, borderRadius: 17, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, marginBottom: 10, ...c.shadow },
    timetableHeadingIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#4E73E8" },
    timetableHeadingText: { flex: 1, minWidth: 0 },
    timetableTitle: { color: c.text, fontSize: 16, fontWeight: "800" },
    timetableSubtitle: { color: c.muted, fontSize: 10, marginTop: 3 },
    rotationNote: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: c.subcard, borderRadius: 12, padding: 10, marginBottom: 12 },
    rotationNoteText: { color: c.muted, fontSize: 10, lineHeight: 15, flex: 1 },
    daySelector: { flexDirection: "row", gap: 5, marginBottom: 16 },
    dayOption: { flex: 1, minWidth: 0, minHeight: 55, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingHorizontal: 1 },
    dayOptionActive: { backgroundColor: c.subcard, borderColor: c.accent, borderWidth: 1.5 },
    dayOptionLabel: { color: c.muted, fontSize: 9, fontWeight: "700" },
    dayOptionLabelActive: { color: c.accent, fontWeight: "900" },
    dayActiveIndicator: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.accent, marginTop: 5 },
    selectedDayHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    selectedDayTitle: { color: c.text, fontSize: 17, fontWeight: "800" },
    selectedDayHint: { color: c.muted, fontSize: 10, marginTop: 2 },
    manualBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: c.subcard, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 6 },
    manualBadgeText: { color: c.accent, fontSize: 8, fontWeight: "700" },
    scheduleList: { gap: 8, paddingBottom: 12 },
    periodCard: { flexDirection: "row", alignItems: "stretch", gap: 10, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 15, padding: 11, minHeight: 66, ...c.shadow },
    periodTimeline: { width: 94, justifyContent: "center" },
    periodNumber: { color: c.accent, fontSize: 9, fontWeight: "900", marginBottom: 4 },
    periodTime: { color: c.muted, fontSize: 8, lineHeight: 13 },
    periodDivider: { width: 1, backgroundColor: c.border },
    periodContent: { flex: 1, minWidth: 0, justifyContent: "center" },
    periodSubject: { flex: 1, color: c.text, fontSize: 11, fontWeight: "800", lineHeight: 15 },
    periodCode: { color: c.accent, fontSize: 9, fontWeight: "700", marginTop: 4 },
    periodFaculty: { color: c.muted, fontSize: 9, marginTop: 3 },
    breakRow: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 3 },
    breakLine: { flex: 1, height: 1, backgroundColor: c.border },
    breakPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: c.subcard, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
    breakText: { color: c.accent, fontSize: 9, fontWeight: "800" },
    breakTime: { color: c.muted, fontSize: 8 },
    empty: { textAlign: "center", color: c.muted, padding: 24 },
    note: { flexDirection: "row", gap: 8, alignItems: "center", padding: 12, marginTop: 3 },
    noteText: { color: c.muted, fontSize: 10, flex: 1, lineHeight: 15 },
    feedList: { gap: 10 },
    feedCard: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 12, ...c.shadow },
    feedTag: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 8 },
    feedTagText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" },
    feedAuthor: { color: c.text, fontSize: 12, fontWeight: "700" },
    feedText: { color: c.muted, fontSize: 11, marginTop: 5, lineHeight: 16 },
    feedMeta: { color: c.accent, fontSize: 10, marginTop: 8, fontWeight: "600" },
    miniMaterialsList: { gap: 8 },
    materialMini: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 10 },
    materialMiniTextWrap: { flex: 1 },
    materialMiniTitle: { color: c.text, fontSize: 12, fontWeight: "700" },
    materialMiniMeta: { color: c.muted, fontSize: 10, marginTop: 2 },
    materialBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
    materialBadgeText: { fontSize: 9, fontWeight: "800" },
    bottomNav: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 6,
      paddingHorizontal: 8,
      backgroundColor: c.nav,
      borderTopWidth: 1,
      borderTopColor: c.border,
      minHeight: 54,
    },
    navItem: { alignItems: "center", justifyContent: "center", flex: 1, minHeight: 42, gap: 2, opacity: 0.8 },
    navLabel: { color: c.muted, fontSize: 9, fontWeight: "500" },
    navActive: { color: c.accent, fontWeight: "700", opacity: 1 },
    modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
    modalSheet: { backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 30, maxHeight: "88%", ...c.shadow },
    modalHandle: { alignSelf: "center", width: 42, height: 4, borderRadius: 3, backgroundColor: c.muted, opacity: 0.5, marginBottom: 12 },
    modalClose: { position: "absolute", right: 17, top: 15, zIndex: 2, padding: 5 },
    modalTitle: { color: c.text, fontSize: 21, fontWeight: "800", textAlign: "center", marginTop: 13 },
    modalSubtitle: { color: c.muted, fontSize: 12, textAlign: "center", marginTop: 6, lineHeight: 18 },
    actionBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: c.accent, borderRadius: 14, paddingVertical: 12, marginTop: 18 },
    actionBarText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
    groupStats: { flexDirection: "row", gap: 9, marginTop: 20, marginBottom: 22 },
    statBox: { flex: 1, paddingVertical: 13, backgroundColor: c.subcard, borderRadius: 14, alignItems: "center" },
    statNumber: { color: c.text, fontSize: 18, fontWeight: "800" },
    statLabel: { color: c.muted, fontSize: 10, marginTop: 4 },
    membersHeading: { color: c.text, fontSize: 15, fontWeight: "800", marginBottom: 8, marginTop: 4 },
    memberRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
    memberAvatar: { width: 34, height: 34, borderRadius: 12, backgroundColor: c.subcard, alignItems: "center", justifyContent: "center" },
    memberName: { color: c.text, flex: 1, fontSize: 13, fontWeight: "600" },
    role: { color: c.accent, fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
    materialCard: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 12, marginTop: 8 },
    materialChip: { alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 8 },
    materialChipText: { fontSize: 9, fontWeight: "800" },
    materialTitle: { color: c.text, fontSize: 12, fontWeight: "700" },
    materialMeta: { color: c.muted, fontSize: 10, marginTop: 4 },
    messageCard: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 12, marginTop: 8 },
    messageLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    messageName: { color: c.text, fontSize: 12, fontWeight: "700" },
    messageRole: { color: c.accent, fontSize: 9, fontWeight: "800" },
    messageText: { color: c.muted, fontSize: 11, lineHeight: 16, marginTop: 8 },
    messageFlags: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
    flagPill: { backgroundColor: c.subcard, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, color: c.accent, fontWeight: "800", fontSize: 9, overflow: "hidden" },
    messageMeta: { color: c.muted, fontSize: 9, marginTop: 5 },
    modalFootnote: { color: c.muted, fontSize: 10, marginTop: 12, lineHeight: 15 },
    managementSheet: { paddingHorizontal: 18, paddingBottom: 24, maxHeight: "88%" },
    managementHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
    managementHeaderButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: c.subcard },
    managementTitle: { color: c.text, fontSize: 17, fontWeight: "800", flex: 1, textAlign: "center", marginHorizontal: 8 },
    managementScroll: { flexShrink: 1 },
    managementContent: { paddingBottom: 8 },
    managementSubtitle: { color: c.muted, fontSize: 12, lineHeight: 18, marginBottom: 14 },
    managementOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, minHeight: 72, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 17, marginBottom: 9 },
    managementOptionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    managementOptionText: { flex: 1, minWidth: 0 },
    managementOptionTitle: { color: c.text, fontSize: 13, fontWeight: "800" },
    managementOptionDescription: { color: c.muted, fontSize: 10, marginTop: 4 },
    inputLabel: { color: c.text, fontSize: 11, fontWeight: "700", marginBottom: 7, marginTop: 5 },
    managementInput: { color: c.text, backgroundColor: c.search, borderWidth: 1, borderColor: c.border, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 11, fontSize: 12, minHeight: 44, marginBottom: 12 },
    descriptionInput: { minHeight: 78, paddingTop: 11 },
    groupTypeOptions: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 12 },
    groupTypeOption: { flexGrow: 1, width: "30%", minWidth: 88, minHeight: 38, alignItems: "center", justifyContent: "center", paddingHorizontal: 7, borderRadius: 12, backgroundColor: c.search, borderWidth: 1, borderColor: c.border },
    groupTypeOptionActive: { backgroundColor: c.subcard, borderColor: c.accent },
    groupTypeText: { color: c.muted, fontSize: 9, fontWeight: "700", textAlign: "center" },
    groupTypeTextActive: { color: c.accent },
    managementPrimaryButton: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: c.accent, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, marginTop: 8, minHeight: 46 },
    managementPrimaryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
    managementCancelButton: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, marginTop: 9, minHeight: 44 },
    managementCancelText: { color: c.text, fontSize: 12, fontWeight: "700" },
    managementDemoNote: { color: c.muted, fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 13 },
    managementEmpty: { alignItems: "center", backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 20 },
    managementEmptyTitle: { color: c.text, fontSize: 13, fontWeight: "800", marginTop: 8 },
    managementEmptyText: { color: c.muted, fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 5 },
    inviteGroupList: { gap: 7, marginBottom: 10 },
    inviteGroupOption: { flexDirection: "row", alignItems: "center", gap: 9, minHeight: 45, padding: 7, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.card },
    inviteGroupOptionActive: { borderColor: c.accent, backgroundColor: c.subcard },
    inviteGroupIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    inviteGroupName: { flex: 1, color: c.text, fontSize: 11, fontWeight: "700" },
    inviteLinkBox: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.search, paddingHorizontal: 10, paddingVertical: 8 },
    inviteLinkText: { flex: 1, color: c.text, fontSize: 10 },
    profileSheet: { alignSelf: "center", width: "88%", backgroundColor: c.surface, borderRadius: 26, padding: 24, alignItems: "center", marginBottom: "55%", ...c.shadow },
    profileIcon: { width: 62, height: 62, borderRadius: 22, backgroundColor: c.subcard, alignItems: "center", justifyContent: "center", marginTop: 18 },
    primaryButton: { flexDirection: "row", gap: 9, alignItems: "center", justifyContent: "center", backgroundColor: c.accent, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 17, marginTop: 22, width: "100%" },
    primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
    secondaryButton: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, marginTop: 12, width: "100%" },
    secondaryButtonText: { color: c.text, fontSize: 13, fontWeight: "700" },
    profileNote: { color: c.muted, fontSize: 10, marginTop: 14, lineHeight: 16, textAlign: "center" },
    notificationList: { width: "100%", marginTop: 16, gap: 10 },
    notificationItem: { flexDirection: "row", alignItems: "flex-start", backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 12 },
    notificationDotLarge: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#FF4D83", marginRight: 10, marginTop: 4 },
    notificationTitle: { color: c.text, fontSize: 12, fontWeight: "700" },
    notificationBody: { color: c.muted, fontSize: 10, marginTop: 4, lineHeight: 16 },
  });
}
