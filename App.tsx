import React, { useMemo, useState } from "react";
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

type Role = "Student" | "Rep" | "Staff";
type MaterialType = "PDF" | "PPT" | "YouTube" | "Zoom" | "Text";
type Tab = "My Classes" | "Recent" | "Important";
type GroupType = "Subject Group" | "Class Group" | "General Group";
type GroupManagementView = "menu" | "create" | "invite" | "join";

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
};

const groups: Group[] = [
  {
    id: "python",
    name: "Python",
    code: "BCA • Subject",
    icon: "code-slash",
    color: "#438BFF",
    description: "Python lab programs, notes, and quick practice updates.",
    summary: "Python notes and lab programs",
    memberCount: 58,
    repNames: ["A. Meera"],
    staffNames: ["Mrs. Nithya", "Mr. David"],
    inviteLink: "https://classvault.demo/invite/python",
    messages: [
      {
        id: "p1",
        author: "A. Meera",
        role: "Rep",
        text: "Updated the list of Python exercises for this week. Please submit the output screenshot before Friday.",
        createdAt: "Today, 10:24 AM",
        expiresAt: "24h from now",
        isPinned: true,
        isImportant: true,
        preservedBy: "Staff review"
      },
      {
        id: "p2",
        author: "R. Karthik",
        role: "Student",
        text: "I am stuck on the nested loop lab. Can someone share a sample answer?",
        createdAt: "Yesterday, 8:45 PM",
        expiresAt: "expired by demo",
        isImportant: false,
        preservedBy: undefined
      },
      {
        id: "p3",
        author: "Mrs. Nithya",
        role: "Staff",
        text: "Keep all strings in single quotes for the first lab, and use proper indentation in Python.",
        createdAt: "Yesterday, 3:10 PM",
        expiresAt: "semester",
        isPinned: true,
        isImportant: true,
        preservedBy: "Staff pinned"
      }
    ],
    materials: [
      { id: "m1", title: "Python Unit 3 Notes", type: "PDF", url: "https://example.com/python-unit-3.pdf", uploadedBy: "Mrs. Nithya", postedAt: "Sep 14, 2025", semesterRetention: "Semester 3" },
      { id: "m2", title: "Loop Practice Video", type: "YouTube", url: "https://www.youtube.com/watch?v=abc123", uploadedBy: "Mr. David", postedAt: "Sep 11, 2025", semesterRetention: "Semester 3" },
      { id: "m3", title: "Lab 4 Instructions", type: "Text", url: "https://example.com/lab-4.html", uploadedBy: "A. Meera", postedAt: "Sep 8, 2025", semesterRetention: "Semester 3" }
    ]
  },
  {
    id: "tamil",
    name: "Tamil",
    code: "BCA • Subject",
    icon: "book",
    color: "#9A5BFF",
    description: "Language practice, grammar notes, and class announcements.",
    summary: "Class materials and announcements",
    memberCount: 51,
    repNames: ["S. Kavitha"],
    staffNames: ["Dr. Elango"],
    inviteLink: "https://classvault.demo/invite/tamil",
    messages: [
      {
        id: "t1",
        author: "Dr. Elango",
        role: "Staff",
        text: "The essay writing format and key vocabulary list are attached below for revision.",
        createdAt: "Today, 9:10 AM",
        expiresAt: "semester",
        isPinned: true,
        isImportant: true,
        preservedBy: "Staff pinned"
      },
      {
        id: "t2",
        author: "S. Kavitha",
        role: "Rep",
        text: "Please check the grammar worksheet before the next class. The deadline is tomorrow.",
        createdAt: "Yesterday, 12:35 PM",
        expiresAt: "24h from now",
        isImportant: true
      },
      {
        id: "t3",
        author: "M. Raja",
        role: "Student",
        text: "Can someone share the poem summary notes? I missed class yesterday.",
        createdAt: "Mon, 7:20 PM",
        expiresAt: "expired by demo",
      }
    ],
    materials: [
      { id: "tm1", title: "Poem Summary Sheet", type: "PDF", url: "https://example.com/tamil-poem-summary.pdf", uploadedBy: "Dr. Elango", postedAt: "Sep 10, 2025", semesterRetention: "Semester 3" },
      { id: "tm2", title: "Grammar Quiz Link", type: "Text", url: "https://example.com/tamil-grammar-quiz", uploadedBy: "S. Kavitha", postedAt: "Sep 7, 2025", semesterRetention: "Semester 3" }
    ]
  },
  {
    id: "english",
    name: "English",
    code: "BCA • Subject",
    icon: "library",
    color: "#F05D9B",
    description: "Communication notes, writing practice, and speaking activities.",
    summary: "Unit notes and important questions",
    memberCount: 54,
    repNames: ["K. Harini"],
    staffNames: ["Ms. Asha"],
    inviteLink: "https://classvault.demo/invite/english",
    messages: [
      {
        id: "e1",
        author: "Ms. Asha",
        role: "Staff",
        text: "Bring your speaking notes for the presentation practice. The rubric remains the same.",
        createdAt: "Today, 8:50 AM",
        expiresAt: "semester",
        isPinned: true,
        preservedBy: "Staff pinned"
      },
      {
        id: "e2",
        author: "K. Harini",
        role: "Rep",
        text: "Important questions for Unit 4 are attached in the materials section.",
        createdAt: "Mon, 2:15 PM",
        expiresAt: "24h from now",
        isImportant: true
      },
      {
        id: "e3",
        author: "N. Anu",
        role: "Student",
        text: "Can somebody share the short story summary? I missed the class yesterday.",
        createdAt: "Sun, 4:20 PM",
        expiresAt: "expired by demo",
      }
    ],
    materials: [
      { id: "em1", title: "Presentation Rubric", type: "PDF", url: "https://example.com/english-rubric.pdf", uploadedBy: "Ms. Asha", postedAt: "Sep 12, 2025", semesterRetention: "Semester 3" },
      { id: "em2", title: "Unit 4 Important Questions", type: "PPT", url: "https://example.com/unit4-questions.pptx", uploadedBy: "K. Harini", postedAt: "Sep 9, 2025", semesterRetention: "Semester 3" }
    ]
  },
  {
    id: "professional-english",
    name: "Professional English",
    code: "BCA • Subject",
    icon: "chatbubbles",
    color: "#11B89A",
    description: "Business communication, vocabulary, interviews, and presentation skills.",
    summary: "Presentation and communication notes",
    memberCount: 45,
    repNames: ["P. Vishnu"],
    staffNames: ["Mrs. Leena"],
    inviteLink: "https://classvault.demo/invite/professional-english",
    messages: [
      {
        id: "pe1",
        author: "Mrs. Leena",
        role: "Staff",
        text: "Your mock interview groups are ready. Please prepare a five-minute self-introduction.",
        createdAt: "Today, 9:55 AM",
        expiresAt: "semester",
        isImportant: true,
        preservedBy: "Staff pinned"
      },
      {
        id: "pe2",
        author: "P. Vishnu",
        role: "Rep",
        text: "The email writing sample is pinned for quick revision before the unit test.",
        createdAt: "Yesterday, 11:40 AM",
        expiresAt: "24h from now",
        isPinned: true,
        isImportant: true
      },
      {
        id: "pe3",
        author: "D. Sanjay",
        role: "Student",
        text: "I posted a sample email cover earlier; are we allowed to reuse the template?",
        createdAt: "Sat, 5:05 PM",
        expiresAt: "expired by demo",
      }
    ],
    materials: [
      { id: "pem1", title: "Mock Interview Guide", type: "PDF", url: "https://example.com/mock-interview-guide.pdf", uploadedBy: "Mrs. Leena", postedAt: "Sep 13, 2025", semesterRetention: "Semester 3" },
      { id: "pem2", title: "Email Writing Examples", type: "Text", url: "https://example.com/email-writing-examples", uploadedBy: "P. Vishnu", postedAt: "Sep 6, 2025", semesterRetention: "Semester 3" }
    ]
  },
  {
    id: "cap",
    name: "CAP",
    code: "BCA • Subject",
    icon: "laptop",
    color: "#F59E0B",
    description: "Computer applications and practical training in software basics.",
    summary: "Latest class update",
    memberCount: 60,
    repNames: ["T. Naveen"],
    staffNames: ["Mr. Senthil"],
    inviteLink: "https://classvault.demo/invite/cap",
    messages: [
      {
        id: "c1",
        author: "Mr. Senthil",
        role: "Staff",
        text: "Today’s practical file is updated and available in the materials section. Please submit by next week.",
        createdAt: "Today, 7:15 AM",
        expiresAt: "semester",
        isImportant: true,
        preservedBy: "Staff pinned"
      },
      {
        id: "c2",
        author: "T. Naveen",
        role: "Rep",
        text: "The desktop shortcut exercise has been updated. Please check the lab file and the screenshots.",
        createdAt: "Mon, 9:15 AM",
        expiresAt: "24h from now",
        isPinned: true,
      },
      {
        id: "c3",
        author: "V. Priya",
        role: "Student",
        text: "I uploaded the screenshot of the first task but I still need help with the final step.",
        createdAt: "Sun, 10:40 PM",
        expiresAt: "expired by demo",
      }
    ],
    materials: [
      { id: "cm1", title: "CAP Practical File", type: "PDF", url: "https://example.com/cap-practical-file.pdf", uploadedBy: "Mr. Senthil", postedAt: "Sep 12, 2025", semesterRetention: "Semester 3" },
      { id: "cm2", title: "Shortcut Exercise Demo", type: "Zoom", url: "https://zoom.us/j/1234567890", uploadedBy: "T. Naveen", postedAt: "Sep 8, 2025", semesterRetention: "Semester 3" }
    ]
  },
  {
    id: "ecommerce",
    name: "E-Commerce",
    code: "BCA • Subject",
    icon: "cart",
    color: "#EF7445",
    description: "Digital business concepts, sales models, and online marketing case studies.",
    summary: "PPT and study materials",
    memberCount: 50,
    repNames: ["J. Fathima"],
    staffNames: ["Mrs. Gayathri"],
    inviteLink: "https://classvault.demo/invite/ecommerce",
    messages: [
      {
        id: "ecom1",
        author: "Mrs. Gayathri",
        role: "Staff",
        text: "Use the online marketplace case study to compare the payment models discussed in class.",
        createdAt: "Today, 11:20 AM",
        expiresAt: "semester",
        isPinned: true,
        preservedBy: "Staff pinned"
      },
      {
        id: "ecom2",
        author: "J. Fathima",
        role: "Rep",
        text: "The case study summary is ready and the quiz answer key is available in the notes section.",
        createdAt: "Sun, 6:05 PM",
        expiresAt: "24h from now",
        isImportant: true
      },
      {
        id: "ecom3",
        author: "R. Siva",
        role: "Student",
        text: "Can someone explain the difference between B2B and B2C in one line?",
        createdAt: "Fri, 9:30 PM",
        expiresAt: "expired by demo",
      }
    ],
    materials: [
      { id: "ecm1", title: "E-Commerce Case Study", type: "PPT", url: "https://example.com/ecommerce-case-study.pptx", uploadedBy: "Mrs. Gayathri", postedAt: "Sep 15, 2025", semesterRetention: "Semester 3" },
      { id: "ecm2", title: "Market Model Notes", type: "PDF", url: "https://example.com/market-model-notes.pdf", uploadedBy: "J. Fathima", postedAt: "Sep 9, 2025", semesterRetention: "Semester 3" }
    ]
  }
];

type OfficialSubject = {
  id: string;
  name: string;
  shortCode: string;
  subjectCode: string | null;
  facultyName: string;
  groupType: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const officialSubjects: OfficialSubject[] = [
  { id: "english", name: "English", shortCode: "ENG", subjectCode: "23ELGE3", facultyName: "Mr. Praveen Kumar Sri", groupType: "BCA Subject", icon: "book", color: "#F05D9B" },
  { id: "cab", name: "Computer Application in Business", shortCode: "CAB", subjectCode: "22SCCACAOB2", facultyName: "Ms. Ishwarya", groupType: "BCA Subject", icon: "laptop", color: "#438BFF" },
  { id: "python", name: "Programming in Python", shortCode: "PYTHON", subjectCode: "22SCCCA3", facultyName: "Mr. M. Sulthan Alavudeen", groupType: "BCA Subject", icon: "code-slash", color: "#11B89A" },
  { id: "python-lab", name: "Programming in Python Lab", shortCode: "PYTHON LAB", subjectCode: "22SCCCA3P", facultyName: "Mr. M. Sulthan Alavudeen", groupType: "Lab", icon: "flask", color: "#22A5C7" },
  { id: "accountancy", name: "Principles of Accountancy", shortCode: "ACC", subjectCode: "22SCCACAOB1", facultyName: "Ms. D. Kanaga Durga Devi", groupType: "BCA Subject", icon: "calculator", color: "#F59E0B" },
  { id: "tamil", name: "Tamil / Tamizhaga Varalarum Panbadum", shortCode: "TAM", subjectCode: "23LCGT3", facultyName: "Dr. N. Kalyani", groupType: "BCA Subject", icon: "library", color: "#9A5BFF" },
  { id: "nme", name: "NME – E-Commerce", shortCode: "NME", subjectCode: "22SNMEVC1", facultyName: "Mr. S. P. Kirthivasan", groupType: "BCA Subject", icon: "cart", color: "#EF7445" },
  { id: "professional-english", name: "Professional English for Physical Science-II", shortCode: "PE", subjectCode: "22PELPS2", facultyName: "Dr. A. Devi", groupType: "BCA Subject", icon: "chatbubbles", color: "#7557FF" },
  { id: "cdc", name: "CDC", shortCode: "CDC", subjectCode: null, facultyName: "CDC Staff", groupType: "CDC", icon: "people", color: "#607D9F" },
];

const officialGroups: Group[] = officialSubjects.map((subject) => {
  const sourceId = subject.id === "cab" ? "cap" : subject.id === "nme" ? "ecommerce" : subject.id;
  const sourceGroup = groups.find((group) => group.id === sourceId);
  return {
    id: subject.id,
    name: subject.name,
    code: subject.subjectCode ?? "Not provided",
    shortCode: subject.shortCode,
    subjectCode: subject.subjectCode,
    facultyName: subject.facultyName,
    groupType: subject.groupType,
    icon: subject.icon,
    color: subject.color,
    description: `${subject.groupType} for II BCA • Odd Semester 2026–2027`,
    summary: subject.groupType,
    memberCount: sourceGroup?.memberCount ?? 0,
    repNames: sourceGroup?.repNames ?? [],
    staffNames: [subject.facultyName],
    inviteLink: sourceGroup?.inviteLink ?? `https://classvault.demo/invite/${subject.id}`,
    messages: sourceGroup?.messages ?? [],
    materials: sourceGroup?.materials ?? [],
  };
});

type TimetableDay = 1 | 2 | 3 | 4 | 5 | 6;
type DailyTimetable = [string | null, string | null, string | null, string | null, string | null];

const timetableDays: TimetableDay[] = [1, 2, 3, 4, 5, 6];

const timetablePeriods = [
  { number: "I", start: "9:00 AM", end: "9:50 AM" },
  { number: "II", start: "9:50 AM", end: "10:40 AM" },
  { number: "III", start: "11:00 AM", end: "11:50 AM" },
  { number: "IV", start: "11:50 AM", end: "12:40 PM" },
  { number: "V", start: "12:40 PM", end: "1:30 PM" },
] as const;

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

const notifications = [
  { id: "n1", title: "Python lab file updated", detail: "Mrs. Nithya shared a new PDF for Unit 3.", read: false },
  { id: "n2", title: "Pinned post preserved", detail: "The Python Rep announcement stayed beyond 24 hours because it was marked important.", read: true },
  { id: "n3", title: "Invite link ready", detail: "The Tamil group invite is available to share with students.", read: false }
];

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
};

const dark = {
  bg: "#071126",
  surface: "#0D1A35",
  card: "#0C1932",
  text: "#F4F6FF",
  muted: "#9BACD2",
  border: "#1B3157",
  search: "#102142",
  nav: "#0A1730",
  subcard: "#13264A",
  accent: "#8D7BFF",
  success: "#2CE5A7",
};

function getMaterialTone(type: MaterialType) {
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
  const [isDark, setIsDark] = useState(true);
  const [activeScreen, setActiveScreen] = useState<"Home" | "Classes">("Home");
  const [selectedDay, setSelectedDay] = useState<TimetableDay>(1);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("My Classes");
  const [groupList, setGroupList] = useState<Group[]>(officialGroups);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupManagementView, setGroupManagementView] = useState<GroupManagementView | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupType, setNewGroupType] = useState<GroupType>("Subject Group");
  const [inviteGroupId, setInviteGroupId] = useState<string | null>(null);
  const [joinValue, setJoinValue] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const c = isDark ? dark : light;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 390 || height < 700;

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
        group.messages.map((m) => m.text).join(" "),
        group.materials.map((m) => m.title).join(" "),
      ].join(" ").toLowerCase();

      return searchableText.includes(lowerQuery);
    });
  }, [groupList, lowerQuery]);

  const recentPosts = useMemo(
    () =>
      groupList.flatMap((group) =>
        group.messages.map((message) => ({
          ...message,
          groupName: group.name,
          groupId: group.id,
          groupColor: group.color,
        }))
      ),
    [groupList]
  );

  const importantPosts = useMemo(
    () =>
      recentPosts.filter(
        (post) => post.isPinned || post.isImportant || post.preservedBy
      ),
    [recentPosts]
  );

  const styles = makeStyles(c, isCompact);
  const selectedInviteGroup = groupList.find((group) => group.id === inviteGroupId) ?? null;

  const toggleTheme = () => setIsDark((value) => !value);

  const openGroupManagement = () => {
    setGroupManagementView("menu");
  };

  const closeGroupManagement = () => {
    setGroupManagementView(null);
  };

  const createGroup = () => {
    const name = newGroupName.trim();
    if (!name) {
      Alert.alert("Group name required", "Enter a name before creating your demo group.");
      return;
    }

    const id = `demo-${Date.now()}`;
    const description = newGroupDescription.trim();
    const createdGroup: Group = {
      id,
      name,
      code: `${newGroupType} • Demo`,
      icon: "people",
      color: "#7557FF",
      description: description || "A locally created demo group.",
      summary: description || "New demo group",
      memberCount: 1,
      repNames: [],
      staffNames: [],
      inviteLink: `https://classvault.demo/invite/${id}`,
      messages: [],
      materials: [],
    };

    setGroupList((currentGroups) => [createdGroup, ...currentGroups]);
    setTab("My Classes");
    setQuery("");
    setNewGroupName("");
    setNewGroupDescription("");
    setNewGroupType("Subject Group");
    closeGroupManagement();
    Alert.alert("Demo group created", `${name} was added to your local group list.`);
  };

  const joinDemoGroup = () => {
    const invite = joinValue.trim();
    if (!invite) {
      Alert.alert("Invite details required", "Paste a demo invite link or enter a group code.");
      return;
    }

    const id = `joined-demo-${Date.now()}`;
    const joinedGroup: Group = {
      id,
      name: `Joined Demo Group ${groupList.length - officialGroups.length + 1}`,
      code: "Joined • Demo",
      icon: "people",
      color: "#11B89A",
      description: "This group was added locally to demonstrate the join flow.",
      summary: "Frontend join demonstration",
      memberCount: 1,
      repNames: [],
      staffNames: [],
      inviteLink: `https://classvault.demo/invite/${id}`,
      messages: [],
      materials: [],
    };

    setGroupList((currentGroups) => [joinedGroup, ...currentGroups]);
    setTab("My Classes");
    setQuery("");
    setJoinValue("");
    closeGroupManagement();
    Alert.alert("Demo join complete", "A mock group was added locally. No real group was joined.");
  };

  const copyInviteLink = async (inviteLink: string) => {
    try {
      await Clipboard.setStringAsync(inviteLink);
      Alert.alert("Demo link copied", "This sample link is for the frontend demonstration only.");
    } catch (error) {
      Alert.alert("Copy failed", error instanceof Error ? error.message : "Could not copy the sample link.");
    }
  };

  const shareInviteLink = async (group: Group) => {
    try {
      await Share.share({
        title: `Invite to ${group.name}`,
        message: `Demo invitation for ${group.name}: https://classvault.demo/invite/${group.id}`,
      });
    } catch (error) {
      Alert.alert("Share failed", error instanceof Error ? error.message : "Could not share the sample link.");
    }
  };

  const renderGroupCard = (group: Group) => (
    <Pressable key={group.id} style={styles.subjectCard} onPress={() => setSelectedGroup(group)}>
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
            <Pressable style={styles.iconButton} onPress={toggleTheme} accessibilityLabel="Toggle theme">
              <Ionicons name={isDark ? "sunny" : "moon"} size={21} color={isDark ? "#FFD36B" : "#5D49E8"} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => setShowNotifications(true)} accessibilityLabel="Notifications">
              <Ionicons name="notifications-outline" size={22} color={c.text} />
              <View style={styles.notificationDot} />
            </Pressable>
            <Pressable style={styles.avatar} onPress={() => setShowProfile(true)}>
              <Ionicons name="person" size={19} color={c.text} />
            </Pressable>
          </View>
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
                <Text style={styles.rotationNoteText}>Select the rotating timetable day manually. It is not tied to the weekday.</Text>
              </View>

              <View style={styles.daySelector}>
                {timetableDays.map((day) => (
                  <Pressable
                    key={day}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedDay === day }}
                    accessibilityLabel={`Select timetable Day ${day}`}
                    style={[styles.dayOption, selectedDay === day && styles.dayOptionActive]}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setSelectedDay(day);
                    }}
                  >
                    <Text style={[styles.dayOptionLabel, selectedDay === day && styles.dayOptionLabelActive]}>Day {day}</Text>
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
                  <Ionicons name="hand-left-outline" size={12} color="#FFD36B" />
                  <Text style={styles.manualBadgeText}>Manual selection</Text>
                </View>
              </View>

              <View style={styles.scheduleList}>
                {timetablePeriods.map((period, index) => {
                  const subjectId = timetableRows[selectedDay][index];
                  const subject = subjectId ? officialGroups.find((group) => group.id === subjectId) : undefined;
                  return (
                    <React.Fragment key={period.number}>
                      {index === 2 && (
                        <View style={styles.breakRow}>
                          <View style={styles.breakLine} />
                          <View style={styles.breakPill}>
                            <Ionicons name="cafe-outline" size={14} color="#FFD36B" />
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
                            <Text style={styles.periodCode}>Subject code: {subject.subjectCode ?? "Not provided"}</Text>
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
              <Text style={styles.collegeName}>SRM Trichy Arts and Science College</Text>
              <Text style={styles.collegeCourse}>II BCA • Computer Applications</Text>
              <Text style={styles.collegeMeta}>Odd Semester • 2026–2027</Text>
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
          {tab === "Recent" && (
            <View style={styles.feedList}>
              {recentPosts.slice(0, 4).map((post) => (
                <Pressable key={post.id} style={styles.feedCard} onPress={() => setSelectedGroup(groupList.find((group) => group.id === post.groupId) ?? null)}>
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
                <Pressable key={post.id} style={styles.feedCard} onPress={() => setSelectedGroup(groupList.find((group) => group.id === post.groupId) ?? null)}>
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

          {visibleGroups.length === 0 && <Text style={styles.empty}>No subjects match your search.</Text>}

          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Recently shared materials</Text>
            <Text style={styles.count}>Demo items</Text>
          </View>

          <View style={styles.miniMaterialsList}>
            {groupList.flatMap((group) =>
              group.materials.slice(0, 1).map((material) => (
                <Pressable key={material.id} style={styles.materialMini} onPress={() => Linking.openURL(material.url)}>
                  <View style={[styles.materialBadge, { backgroundColor: getMaterialTone(material.type).bg }]}>
                    <Text style={[styles.materialBadgeText, { color: getMaterialTone(material.type).text }]}>{material.type}</Text>
                  </View>
                  <View style={styles.materialMiniTextWrap}>
                    <Text style={styles.materialMiniTitle}>{material.title}</Text>
                    <Text style={styles.materialMiniMeta}>{group.name} • {material.uploadedBy}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>

          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={18} color={c.muted} />
            <Text style={styles.noteText}>
              Demo prototype only. Login, group invites, message expiry, and staff permission checks are simulated in the UI and must be enforced by a backend for production.
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

                <Pressable
                  style={styles.actionBar}
                  onPress={() => Linking.openURL(selectedGroup.inviteLink)}
                >
                  <Ionicons name="link-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.actionBarText}>Open invite link</Text>
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
                {[...selectedGroup.repNames, ...selectedGroup.staffNames, "Student A", "Student B"].map((member, index) => (
                  <View key={`${member}-${index}`} style={styles.memberRow}>
                    <View style={styles.memberAvatar}>
                      <Ionicons name={index < selectedGroup.repNames.length + selectedGroup.staffNames.length ? "person" : "person-outline"} size={17} color={c.text} />
                    </View>
                    <Text style={styles.memberName}>{member}</Text>
                    {index < selectedGroup.repNames.length && <Text style={styles.role}>REP</Text>}
                    {index >= selectedGroup.repNames.length && index < selectedGroup.repNames.length + selectedGroup.staffNames.length && <Text style={styles.role}>STAFF</Text>}
                    {index >= selectedGroup.repNames.length + selectedGroup.staffNames.length && <Text style={styles.role}>STUDENT</Text>}
                  </View>
                ))}

                <Text style={styles.membersHeading}>Materials</Text>
                {selectedGroup.materials.map((material) => {
                  const tones = getMaterialTone(material.type);
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
                  Demo notice: class permissions and expiry rules are shown for prototype purposes only. Backend validation is required in production.
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
            <Text style={styles.modalSubtitle}>Prototype activity feed</Text>
            <View style={styles.notificationList}>
              {notifications.map((item) => (
                <View key={item.id} style={styles.notificationItem}>
                  <View style={styles.notificationDotLarge} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text style={styles.notificationBody}>{item.detail}</Text>
                  </View>
                </View>
              ))}
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
            <Text style={styles.modalSubtitle}>Student demo account • Demo mode</Text>

            <Pressable style={styles.primaryButton} onPress={() => { setShowProfile(false); toggleTheme(); }}>
              <Ionicons name={isDark ? "sunny" : "moon"} size={19} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Switch to {isDark ? "Light" : "Dark"} mode</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={() => { setShowProfile(false); setShowNotifications(true); }}>
              <Ionicons name="notifications-outline" size={18} color={c.text} />
              <Text style={styles.secondaryButtonText}>Open notifications</Text>
            </Pressable>

            <Text style={styles.profileNote}>Protected Staff and Rep actions must be validated in a backend before production release.</Text>
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
                      <Text style={styles.managementOptionDescription}>Set up a group in this demo</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={c.muted} />
                  </Pressable>
                  <Pressable
                    style={styles.managementOption}
                    onPress={() => {
                      setInviteGroupId(groupList[0]?.id ?? null);
                      setGroupManagementView("invite");
                    }}
                  >
                    <View style={[styles.managementOptionIcon, { backgroundColor: "#2378D4" }]}>
                      <Ionicons name="link" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.managementOptionText}>
                      <Text style={styles.managementOptionTitle}>Invite Group Link</Text>
                      <Text style={styles.managementOptionDescription}>Copy or share a sample link</Text>
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
                  <Text style={styles.managementDemoNote}>Frontend demo only • No real groups or invite links are created or shared.</Text>
                </>
              )}

              {groupManagementView === "create" && (
                <>
                  <Text style={styles.managementSubtitle}>Add a temporary group to this device’s demo list.</Text>
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
                  <Pressable style={styles.managementPrimaryButton} onPress={createGroup}>
                    <Ionicons name="people" size={18} color="#FFFFFF" />
                    <Text style={styles.managementPrimaryText}>Create Group</Text>
                  </Pressable>
                  <Pressable style={styles.managementCancelButton} onPress={closeGroupManagement}>
                    <Text style={styles.managementCancelText}>Cancel</Text>
                  </Pressable>
                  <Text style={styles.managementDemoNote}>This group exists only in local app state and resets when the app restarts.</Text>
                </>
              )}

              {groupManagementView === "invite" && (
                <>
                  <Text style={styles.managementSubtitle}>Select a group to preview its sample invitation link.</Text>
                  {groupList.length === 0 ? (
                    <View style={styles.managementEmpty}>
                      <Ionicons name="people-outline" size={30} color={c.muted} />
                      <Text style={styles.managementEmptyTitle}>No groups yet</Text>
                      <Text style={styles.managementEmptyText}>Create a demo group first to preview an invite link.</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.inviteGroupList}>
                        {groupList.map((group) => (
                          <Pressable
                            key={group.id}
                            style={[styles.inviteGroupOption, inviteGroupId === group.id && styles.inviteGroupOptionActive]}
                            onPress={() => setInviteGroupId(group.id)}
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
                          <Text style={styles.inputLabel}>Sample invitation link</Text>
                          <View style={styles.inviteLinkBox}>
                            <Ionicons name="link-outline" size={17} color={c.accent} />
                            <Text style={styles.inviteLinkText} selectable>
                              https://classvault.demo/invite/{selectedInviteGroup.id}
                            </Text>
                          </View>
                          <Pressable
                            style={styles.managementPrimaryButton}
                            onPress={() => void copyInviteLink(`https://classvault.demo/invite/${selectedInviteGroup.id}`)}
                          >
                            <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
                            <Text style={styles.managementPrimaryText}>Copy Link</Text>
                          </Pressable>
                          <Pressable style={styles.managementCancelButton} onPress={() => void shareInviteLink(selectedInviteGroup)}>
                            <Ionicons name="share-social-outline" size={17} color={c.text} />
                            <Text style={styles.managementCancelText}>Share Link</Text>
                          </Pressable>
                        </>
                      )}
                    </>
                  )}
                  <Text style={styles.managementDemoNote}>Demo link only • It does not validate invitations or open a real group.</Text>
                </>
              )}

              {groupManagementView === "join" && (
                <>
                  <Text style={styles.managementSubtitle}>Enter any demo code or sample link to preview the join flow.</Text>
                  <Text style={styles.inputLabel}>Group invite link or code</Text>
                  <TextInput
                    value={joinValue}
                    onChangeText={setJoinValue}
                    placeholder="Paste a link or enter a group code"
                    placeholderTextColor={c.muted}
                    style={styles.managementInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable style={styles.managementPrimaryButton} onPress={joinDemoGroup}>
                    <Ionicons name="person-add" size={18} color="#FFFFFF" />
                    <Text style={styles.managementPrimaryText}>Join Group</Text>
                  </Pressable>
                  <Pressable style={styles.managementCancelButton} onPress={closeGroupManagement}>
                    <Text style={styles.managementCancelText}>Cancel</Text>
                  </Pressable>
                  <Text style={styles.managementDemoNote}>Join is simulated locally. No invitation is validated and no shared group is joined.</Text>
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
    collegeCard: { flexDirection: "row", alignItems: "center", gap: 9, padding: isCompact ? 9 : 11, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, marginBottom: 12 },
    collegeIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#4E73E8", alignItems: "center", justifyContent: "center" },
    collegeName: { color: c.text, fontSize: 12, fontWeight: "800", lineHeight: 17 },
    collegeCourse: { color: c.muted, fontSize: 11, marginTop: 2 },
    collegeMeta: { color: c.accent, fontSize: 10, marginTop: 2, fontWeight: "600" },
    searchRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
    searchBox: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.search, borderRadius: 13, borderWidth: 1, borderColor: c.border, paddingHorizontal: 11, height: isCompact ? 40 : 43 },
    searchInput: { flex: 1, color: c.text, fontSize: 12.5, paddingVertical: 0 },
    filterButton: { width: isCompact ? 40 : 43, height: isCompact ? 40 : 43, borderRadius: 13, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
    tabs: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    tab: { paddingHorizontal: 6, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 4, borderBottomWidth: 2, borderBottomColor: "transparent" },
    activeTab: { borderBottomColor: c.accent },
    tabText: { color: c.muted, fontSize: 11.5, fontWeight: "600" },
    activeTabText: { color: c.accent, fontWeight: "800" },
    tinyDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#FF4D83" },
    sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    sectionTitle: { color: c.text, fontSize: 14, fontWeight: "800" },
    count: { color: c.muted, fontSize: 10 },
    subjectCard: { flexDirection: "row", alignItems: "center", gap: 9, padding: 10, borderRadius: 15, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, marginBottom: 8, minHeight: 94 },
    subjectIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    subjectInfo: { flex: 1, minWidth: 0 },
    subjectTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 5 },
    subjectName: { color: c.text, fontWeight: "800", fontSize: 12, flex: 1, lineHeight: 16 },
    subjectShortCode: { color: "#FFD36B", fontSize: 8, fontWeight: "900", backgroundColor: c.subcard, overflow: "hidden", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 3 },
    subjectCode: { color: c.muted, fontSize: 9, marginTop: 3 },
    subjectFaculty: { color: c.text, fontSize: 9, marginTop: 2, fontWeight: "600" },
    subjectType: { color: c.muted, fontSize: 8, marginTop: 2 },
    subjectRight: { alignItems: "flex-end", justifyContent: "center", gap: 4, minWidth: 35 },
    time: { color: c.muted, fontSize: 8 },
    timetableHeading: { flexDirection: "row", alignItems: "center", gap: 11, padding: 14, borderRadius: 17, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, marginBottom: 10 },
    timetableHeadingIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#4E73E8" },
    timetableHeadingText: { flex: 1, minWidth: 0 },
    timetableTitle: { color: c.text, fontSize: 16, fontWeight: "800" },
    timetableSubtitle: { color: c.muted, fontSize: 10, marginTop: 3 },
    rotationNote: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: c.subcard, borderRadius: 12, padding: 10, marginBottom: 12 },
    rotationNoteText: { color: c.muted, fontSize: 10, lineHeight: 15, flex: 1 },
    daySelector: { flexDirection: "row", gap: 5, marginBottom: 16 },
    dayOption: { flex: 1, minWidth: 0, minHeight: 55, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingHorizontal: 1 },
    dayOptionActive: { backgroundColor: "#17345F", borderColor: "#FFD36B", borderWidth: 1.5 },
    dayOptionLabel: { color: c.muted, fontSize: 9, fontWeight: "700" },
    dayOptionLabelActive: { color: "#FFD36B", fontWeight: "900" },
    dayActiveIndicator: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#FFD36B", marginTop: 5 },
    selectedDayHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    selectedDayTitle: { color: c.text, fontSize: 17, fontWeight: "800" },
    selectedDayHint: { color: c.muted, fontSize: 10, marginTop: 2 },
    manualBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: c.subcard, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 6 },
    manualBadgeText: { color: "#FFD36B", fontSize: 8, fontWeight: "700" },
    scheduleList: { gap: 8, paddingBottom: 12 },
    periodCard: { flexDirection: "row", alignItems: "stretch", gap: 10, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 15, padding: 11, minHeight: 66 },
    periodTimeline: { width: 94, justifyContent: "center" },
    periodNumber: { color: c.accent, fontSize: 9, fontWeight: "900", marginBottom: 4 },
    periodTime: { color: c.muted, fontSize: 8, lineHeight: 13 },
    periodDivider: { width: 1, backgroundColor: c.border },
    periodContent: { flex: 1, minWidth: 0, justifyContent: "center" },
    periodSubject: { flex: 1, color: c.text, fontSize: 11, fontWeight: "800", lineHeight: 15 },
    periodCode: { color: "#FFD36B", fontSize: 9, fontWeight: "700", marginTop: 4 },
    periodFaculty: { color: c.muted, fontSize: 9, marginTop: 3 },
    breakRow: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 3 },
    breakLine: { flex: 1, height: 1, backgroundColor: c.border },
    breakPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: c.subcard, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
    breakText: { color: "#FFD36B", fontSize: 9, fontWeight: "800" },
    breakTime: { color: c.muted, fontSize: 8 },
    empty: { textAlign: "center", color: c.muted, padding: 24 },
    note: { flexDirection: "row", gap: 8, alignItems: "center", padding: 12, marginTop: 3 },
    noteText: { color: c.muted, fontSize: 10, flex: 1, lineHeight: 15 },
    feedList: { gap: 10 },
    feedCard: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 12 },
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
    modalSheet: { backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 30, maxHeight: "88%" },
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
    profileSheet: { alignSelf: "center", width: "88%", backgroundColor: c.surface, borderRadius: 26, padding: 24, alignItems: "center", marginBottom: "55%" },
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
