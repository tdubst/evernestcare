import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type NoticeState = "idle" | "auth" | "cleared";

const continuityRows = [
  {
    icon: "shield-checkmark-outline",
    label: "Signed-out state",
    value: "Ready",
    detail: "No care details are shown until a signed-in workspace is available.",
  },
  {
    icon: "reader-outline",
    label: "Continuity mode",
    value: "Read-only",
    detail: "Native writes stay off for this beta baseline.",
  },
  {
    icon: "lock-closed-outline",
    label: "Local session",
    value: "Clearable",
    detail: "The current proof stores no care content on this device.",
  },
] as const;

const readinessRows = [
  "Expo app loads from a single safe entry point.",
  "Safe areas and scroll behavior are supported on iPhone-class screens.",
  "Camera, scanner, native sharing, push details, and Apple Health are off.",
  "Crash and QA evidence must remain content-free.",
] as const;

export default function App() {
  const [notice, setNotice] = useState<NoticeState>("idle");

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>Native beta baseline</Text>
        <Text style={styles.title}>Evernest Care</Text>
        <Text style={styles.subtitle}>
          Mobile continuity is in safe read-only setup while signed-in access is prepared.
        </Text>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusIcon}>
          <Ionicons name="phone-portrait-outline" size={24} color="#0f3d32" />
        </View>
        <View style={styles.statusCopy}>
          <Text style={styles.cardTitle}>Mobile workspace unavailable</Text>
          <Text style={styles.cardText}>
            Sign-in is deferred in this baseline. Care details stay hidden until the native auth
            path is reviewed and connected.
          </Text>
        </View>
      </View>

      {notice !== "idle" && (
        <View style={notice === "cleared" ? styles.readyNotice : styles.infoNotice}>
          <Ionicons
            name={notice === "cleared" ? "checkmark-circle-outline" : "information-circle-outline"}
            size={20}
            color={notice === "cleared" ? "#174235" : "#224b63"}
          />
          <Text style={styles.noticeText}>
            {notice === "cleared"
              ? "Local beta session state cleared."
              : "Native sign-in will use the reviewed Supabase session path before beta use."}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setNotice("auth")}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Ionicons name="log-in-outline" size={20} color="#ffffff" />
          <Text style={styles.primaryButtonText}>Review sign-in status</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setNotice("cleared")}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Ionicons name="trash-outline" size={20} color="#173c33" />
          <Text style={styles.secondaryButtonText}>Clear local session state</Text>
        </Pressable>
      </View>

      <SectionTitle label="Continuity readiness" />
      <View style={styles.rowStack}>
        {continuityRows.map((row) => (
          <View key={row.label} style={styles.rowCard}>
            <View style={styles.rowIcon}>
              <Ionicons name={row.icon} size={21} color="#173c33" />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowDetail}>{row.detail}</Text>
            </View>
            <Text style={styles.rowValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <SectionTitle label="Beta limits" />
      <View style={styles.limitCard}>
        {readinessRows.map((item) => (
          <View key={item} style={styles.limitRow}>
            <View style={styles.limitDot} />
            <Text style={styles.limitText}>{item}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

const colors = {
  background: "#f8f6f1",
  blush: "#ffd8d5",
  border: "#e5ddd0",
  card: "#fffaf4",
  foreground: "#111827",
  muted: "#68727f",
  primary: "#174235",
  sage: "#b8dfc6",
  sky: "#c9ebfb",
  skyText: "#224b63",
};

const styles = StyleSheet.create({
  actions: {
    gap: 12,
    marginTop: 18,
  },
  background: {
    backgroundColor: colors.background,
  },
  cardText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },
  cardTitle: {
    color: colors.foreground,
    fontSize: 17,
    fontWeight: "800",
  },
  content: {
    gap: 0,
    paddingBottom: 40,
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  header: {
    gap: 10,
    paddingTop: 12,
  },
  infoNotice: {
    alignItems: "flex-start",
    backgroundColor: colors.sky,
    borderRadius: 18,
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    padding: 14,
  },
  limitCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    marginTop: 12,
    padding: 16,
  },
  limitDot: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    height: 8,
    marginTop: 7,
    width: 8,
  },
  limitRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
  },
  limitText: {
    color: colors.foreground,
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  noticeText: {
    color: colors.foreground,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.78,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  readyNotice: {
    alignItems: "flex-start",
    backgroundColor: colors.sage,
    borderRadius: 18,
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    padding: 14,
  },
  rowCard: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  rowCopy: {
    flex: 1,
    gap: 4,
  },
  rowDetail: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  rowIcon: {
    alignItems: "center",
    backgroundColor: colors.sage,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  rowLabel: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "800",
  },
  rowStack: {
    gap: 10,
    marginTop: 12,
  },
  rowValue: {
    color: colors.primary,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginTop: 30,
    textTransform: "uppercase",
  },
  statusCard: {
    alignItems: "flex-start",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    marginTop: 22,
    padding: 16,
  },
  statusCopy: {
    flex: 1,
  },
  statusIcon: {
    alignItems: "center",
    backgroundColor: colors.blush,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 18,
    lineHeight: 27,
  },
  title: {
    color: colors.foreground,
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: 0,
  },
});
