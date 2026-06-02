import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const todayCards = [
  { icon: "medical-outline", label: "Medications", value: "2 due", detail: "Next at 1:00 PM" },
  { icon: "calendar-outline", label: "Appointment", value: "11:30 AM", detail: "David driving" },
  { icon: "pulse-outline", label: "Vitals", value: "124/78", detail: "Last checked Fri" },
] as const;

const actions = [
  { icon: "medical-outline", label: "Medications", badge: "2 due", tone: "#ffd8d5" },
  { icon: "pulse-outline", label: "Vitals", badge: "Last Fri", tone: "#b8dfc6" },
  { icon: "clipboard-outline", label: "Visit Prep", badge: "Ready", tone: "#c9ebfb" },
] as const;

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.date}>Tuesday, May 26</Text>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.subtitle}>Good morning, Sarah. Here is what matters for Mom today.</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>MC</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileName}>Margaret Chen</Text>
            <Text style={styles.profileMeta}>82 · Older adult care · 4 on team</Text>
          </View>
          <Text style={styles.switchText}>Switch</Text>
        </View>

        <Text style={styles.sectionTitle}>Today at a glance</Text>
        <View style={styles.cardGrid}>
          {todayCards.map((card) => (
            <View key={card.label} style={styles.glanceCard}>
              <View style={styles.iconBubble}>
                <Ionicons name={card.icon} size={24} color="#103d32" />
              </View>
              <Text style={styles.cardLabel}>{card.label}</Text>
              <Text style={styles.cardValue}>{card.value}</Text>
              <Text style={styles.cardDetail}>{card.detail}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionRow}>
          {actions.map((action) => (
            <TouchableOpacity key={action.label} style={styles.action}>
              <View style={[styles.actionIcon, { backgroundColor: action.tone }]}>
                <Ionicons name={action.icon} size={30} color="#173c33" />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionBadge}>{action.badge}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Today’s priorities</Text>
        <View style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>Things to review</Text>
          <Text style={styles.reviewText}>
            Medication confirmations and vitals updates are ready to review before the next visit.
          </Text>
          <View style={styles.reviewPill}>
            <Text style={styles.reviewPillText}>For care coordination only</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f6f1",
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  date: {
    marginTop: 24,
    color: "#68727f",
    fontSize: 17,
    fontWeight: "600",
  },
  title: {
    marginTop: 14,
    color: "#111827",
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: 0,
  },
  subtitle: {
    marginTop: 18,
    color: "#68727f",
    fontSize: 22,
    lineHeight: 32,
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 28,
    flexDirection: "row",
    gap: 16,
    marginTop: 28,
    padding: 18,
    shadowColor: "#233129",
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#ffd8d5",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  avatarText: {
    color: "#7f332d",
    fontSize: 18,
    fontWeight: "800",
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    color: "#111827",
    fontSize: 21,
    fontWeight: "800",
  },
  profileMeta: {
    color: "#68727f",
    fontSize: 15,
    marginTop: 4,
  },
  switchText: {
    color: "#2c92c8",
    fontSize: 17,
    fontWeight: "700",
  },
  sectionTitle: {
    color: "#68727f",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 34,
    textTransform: "uppercase",
  },
  cardGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  glanceCard: {
    backgroundColor: "#fff",
    borderRadius: 26,
    flex: 1,
    minHeight: 174,
    padding: 16,
    shadowColor: "#233129",
    shadowOpacity: 0.06,
    shadowRadius: 14,
  },
  iconBubble: {
    alignItems: "center",
    backgroundColor: "#c9ebfb",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  cardLabel: {
    color: "#68727f",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 24,
    textTransform: "uppercase",
  },
  cardValue: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 12,
  },
  cardDetail: {
    color: "#68727f",
    fontSize: 14,
    marginTop: 8,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 28,
  },
  action: {
    alignItems: "center",
    flex: 1,
  },
  actionIcon: {
    alignItems: "center",
    borderRadius: 34,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  actionLabel: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 12,
  },
  actionBadge: {
    backgroundColor: "#eaf1f5",
    borderRadius: 14,
    color: "#68727f",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 26,
    marginTop: 14,
    padding: 18,
  },
  reviewTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
  },
  reviewText: {
    color: "#68727f",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  reviewPill: {
    alignSelf: "flex-start",
    backgroundColor: "#eaf1f5",
    borderRadius: 16,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reviewPillText: {
    color: "#38515f",
    fontSize: 13,
    fontWeight: "700",
  },
});
