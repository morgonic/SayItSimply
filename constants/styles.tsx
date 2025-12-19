import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 24
    },
    logo: {
        width: 160,
        height: 160, 
        resizeMode: 'contain',
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 24
    },
    separatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 40
    },
    separatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E6E6E6'
    },
    separatorText: {
        marginHorizontal: 8,
        color: '#828282',
        fontSize: 14
    },
    // dashboard specific
    dashSafe: { flex: 1, backgroundColor: "#0D1321" },
  dashContainer: { flex: 1, backgroundColor: "#0D1321" },

  dashHeader: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dashHeaderIconBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  dashHeaderIcon: { color: "white", fontSize: 22 },
  dashHeaderTitle: {
    color: "#ECC8AF",
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  dashAvatarBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  dashAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.35)",
  },

  dashContent: { flex: 1, paddingHorizontal: 18 },

  dashSectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
    marginTop: 6,
  },

  dashScanRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
    marginBottom: 14,
  },
  dashScanBtn: {
    width: 98,
    height: 76,
    borderRadius: 14,
    backgroundColor: "#2E8B9C",
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  dashScanIcon: { fontSize: 30 },

  dashContinueCardWrap: {
    alignSelf: "center",
    width: "82%",
    marginTop: 8,
  },
  dashBookmark: {
    position: "absolute",
    right: 12,
    top: -6,
    width: 18,
    height: 26,
    backgroundColor: "#B65A43",
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    zIndex: 2,
  },
  dashContinueCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.06)",
  },
  dashContinueTitle: {
    color: "#1B1B1B",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  dashContinueBtn: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  dashContinueBtnText: { color: "#222", fontWeight: "800", marginRight: 8 },
  dashContinueBtnArrow: { color: "#222", fontSize: 18, fontWeight: "900" },

  dashShortcutsTitleSpacing: { marginTop: 18 },

  dashShortcutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 10,
  },
  dashShortcutCardOuter: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(233,198,166,0.9)",
    padding: 2,
  },
  dashShortcutCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    padding: 12,
    minHeight: 150,
  },
  dashShortcutTitle: {
    color: "#1B1B1B",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },
  dashBulletGroup: { gap: 6, marginBottom: 10 },
  dashBullet: { color: "#1F1F1F", fontSize: 12, fontWeight: "600" },

  dashViewAllBtn: {
    marginTop: "auto",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    width: "95%",
    justifyContent: "center",
  },
  dashViewAllText: { color: "#222", fontWeight: "900", marginRight: 8 },
  dashViewAllArrow: { color: "#222", fontSize: 18, fontWeight: "900" },

  dashLoginWrap: {
    paddingHorizontal: 18,
  },
  dashLoginBtn: {
    backgroundColor: "#809BCE",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  dashLoginText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});