import { StyleSheet, Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

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
    marginVertical: 30
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
  dashSafe: { 
    flex: 1, 
    backgroundColor: "#0D1321"
  },
  dashContainer: { 
    flex: 1, 
    backgroundColor: "#0D1321",
    marginTop: screenHeight * 0.03,
    marginLeft: screenWidth * 0.05,
    marginRight: screenWidth * 0.05 
  },

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

  dashContent: {
    flex: 1,
    paddingHorizontal: 36,
    marginTop: screenHeight * 0.05
  },

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
    marginBottom: 28,
  },
  dashScanBtn: {
    width: 98,
    height: 98,
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
    marginBottom: 12
  },
  dashBookmark: {
    position: "absolute",
    right: 12,
    top: -6,
    width: 18,
    height: 26,
    backgroundColor: "#8C311C",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    zIndex: 2,
    elevation: 2
  },
  dashBookmarkNotch: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    marginLeft: 'auto',
    marginRight: 'auto',
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#fffffff2'
  },
  dashContinueCard: {
    backgroundColor: "#fffffff2",
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
    marginTop: 10
  },
  dashShortcutCardOuter: {
    flex: 1,
    borderRadius: 14,
    //borderWidth: 3,
    backgroundColor: "rgba(233,198,166,0.9)",
    padding: 6,
    marginLeft: 6,
    marginRight: 6,
    height: 190,
    width: 150,
    justifyContent: 'center',
    alignItems: 'center'
  },
  dashShortcutCardInnerOuter: {
    flex: 1,
    borderRadius: 14,
    //borderWidth: 3,
    backgroundColor: "#277A8C",
    padding: 6,
    height: 180,
    width: 140,
    justifyContent: 'center',
    alignItems: 'center'
  },
  dashShortcutCard: {
    flex: 1,
    backgroundColor: "#fffffff2",
    borderRadius: 14,
    padding: 12,
    height: 170,
    width: 130,
    justifyContent: 'center',
    alignItems: 'center'
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
    backgroundColor: "#fffffff2",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00000014",
    width: 100,
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
  radioButtonContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    borderColor: '#6C6767',
    borderWidth: 2,
    backgroundColor: '#D9D9D9',
    width: screenWidth * 0.7
  },
  onboardNextButton: {
    backgroundColor: '#809BCE',
    width: screenWidth * 0.3,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  onboardPrevButton: {
    backgroundColor: '#809BCE',
    width: screenWidth * 0.3,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  }
});

const BG = "#0B1020";
const ACCENT = "#E9C6A6";
const TAB_ACTIVE = "#C97E6F";
const TAB_INACTIVE = "#E9C6A6";
const CARD_BORDER = "#2C9AA4";
const PAPER = "#FFFFF2";
const BADGE = "#B65A43";
const CTA = "#2C9AA4";

export const readerStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG
  },
  fullFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 16
  },

  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    marginRight: 8
  },
  headerIcon: { color: "white", fontSize: 36, marginTop: 8, marginLeft: 8 },
  headerTitle: { color: ACCENT, fontSize: 26, fontWeight: "700" },
  avatarBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "flex-end" },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.35)",
  },

  actionItemBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: 'center',
    borderRadius: 12,
    borderColor: 'rgba(0,0,0,0.5)',
    borderWidth: 0.5,
    shadowColor: 'black',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 2
  },

  tabRow: {
    marginTop: Dimensions.get('window').height * 0.034,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 6
  },
  topTab: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  topTabActive: { backgroundColor: TAB_ACTIVE },
  topTabInactive: { backgroundColor: TAB_INACTIVE },
  topTabText: { fontSize: 14, fontWeight: "800" },
  topTabTextActive: { color: "#1B1B1B" },
  topTabTextInactive: { color: "#1B1B1B" },

  outerCard: {
    marginTop: 15,
    borderRadius: 24,
    borderWidth: 12,
    borderColor: TAB_INACTIVE,
    backgroundColor: CARD_BORDER,
    padding: 12,
    position: "relative",
  },

  badge: {
    position: "absolute",
    right: 14,
    top: -20,
    width: 80,
    height: 100,
    borderRadius: 8,
    backgroundColor: BADGE,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
    elevation: 3,
  },
  badgeText: {
    color: "white",
    fontWeight: "800",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 14,
  },
  badgeNotch: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    transform: [{ translateX: -40 }],
    width: 0,
    height: 0,
    borderLeftWidth: 40,
    borderRightWidth: 40,
    borderBottomWidth: 36,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFF2',
  },

  innerPaper: {
    flex: 1,
    backgroundColor: PAPER,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 18,
  },

  paperMenuBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  paperMenuIcon: { color: "#222", fontSize: 20, fontWeight: "900" },

  bodyScroll: {
    flex: 1
  },
  bodyScrollContent: {
    paddingVertical: 24,
    paddingHorizontal: 12,
    width: '100%'
  },
  bodyText: {
    color: "#1B1B1B",
    fontSize: 16.67,
    lineHeight: 24,
    fontWeight: "600",
    flexShrink: 1,
    flexWrap: 'wrap'
  },

  ctaBtn: {
    marginTop: 14,
    alignSelf: "center",
    width: "88%",
    height: 46,
    borderRadius: 12,
    backgroundColor: CTA,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
  },
  ctaText: { color: "white", fontWeight: "900", fontSize: 16 },

  complexWord: {
    color: '#8C311C',
    fontWeight: '800',
    textDecorationLine: 'underline'
  },

  definitionBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  definitionModalCard: {
    backgroundColor: PAPER,
    borderRadius: 16,
    padding: 16,
    borderWidth: 8,
    borderColor: CARD_BORDER,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    width: '100%',
    maxWidth: 340
  },
  definitionModalWordText: {
    fontWeight: '900',
    color: '#000000',
    marginBottom: 6
  },
  definitionModalDefinitionText: {
    fontWeight: '600',
    color: '#000000',
    lineHeight: 20
  },

  levelControlsWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: -25,
  },

  levelTab: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "#1B1B1B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1B1B1B",
  },

  levelTabActive: { backgroundColor: TAB_ACTIVE },
  levelTabInactive: { backgroundColor: TAB_INACTIVE },

  levelTabText: {
    marginTop: 4,
    fontWeight: "900",
    fontSize: 12,
    color: "#1B1B1B",
  },

  levelTabHint: {
    marginTop: 2,
    fontWeight: "700",
    fontSize: 10,
    color: "#1B1B1B",
  },

  calibBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  calibModalCard: {
    width: '100%',
    maxWidth: 420,
    height: Dimensions.get("window").height * 0.72,
    backgroundColor: PAPER,
    borderRadius: 18,
    borderWidth: 10,
    borderColor: CARD_BORDER,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    overflow: "hidden",
  },
  calibTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: "#1B1B1B",
    marginBottom: 4,
  },
  calibLoadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
  },
  calibLoadTxt: {
    fontWeight: "800",
    color: "#1B1B1B",
  },
  calibCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  calibBodyScroll: {
    flex: 1,
  },
  calibBodyContent: {
    padding: 14,
    flexGrow: 1,
  },
  calibErrTxt: {
    fontWeight: "800",
    color: "#8C311C",
    paddingVertical: 14,
  },
  calibOptsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  calibOpt: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.15)",
    backgroundColor: "rgba(0,0,0,0.03)",
    overflow: "hidden",
  },
  calibOptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  calibOptHeaderTxt: {
    fontWeight: "900",
    color: "#1B1B1B",
    fontSize: 12,
  },
  calibOptScroll: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  calibOptTxt: {
    fontWeight: "600",
    color: "#1B1B1B",
    lineHeight: 20,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  calibBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  calibBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  calibBtnLow: {
    backgroundColor: CTA,
  },
  calibBtnHigh: {
    backgroundColor: CTA,
  },
  calibBtnStay: {
    backgroundColor: TAB_INACTIVE,
    borderWidth: 1,
    borderColor: "#1B1B1B",
  },
  calibChoiceTxt: {
    color: "white",
    fontWeight: "900",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 14,
    flexWrap: "wrap",
  },
  calibChoiceDarkTxt: {
    color: "#1B1B1B",
    fontWeight: "900",
  }
});

const BG_CAMERA = "#0B1020";
const ACCENT_CAMERA = "#E9C6A6";
const PREVIEW_BG_CAMERA = "#C8D7F0";
const TEXT_MUTED_CAMERA = "rgba(255,255,255,0.65)";

export const cameraStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG_CAMERA },
  container: { flex: 1, backgroundColor: BG_CAMERA, paddingHorizontal: 16 },

  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerIcon: { color: "white", fontSize: 22 },
  headerTitle: {
    color: ACCENT_CAMERA,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  avatarBtn: { width: 44, height: 44, alignItems: "flex-end", justifyContent: "center" },
  avatarPlaceholder: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.35)" },
  avatar: { width: 32, height: 32, borderRadius: 16 },

  thumbBtn: {
  width: 52,
  height: 52,
  borderRadius: 14,
  overflow: "hidden",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255,255,255,0.06)",
},
thumbImage: { width: "100%", height: "100%" },

  previewWrap: {
    marginTop: 6,
    borderRadius: 36,
    overflow: "hidden",
  },
  preview: {
    flex: 1,
    backgroundColor: PREVIEW_BG_CAMERA,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  camera: { flex: 1, width: "100%", height: "100%", },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  previewHintDark: { color: "rgba(0,0,0,0.45)", fontWeight: "600" },
  permissionBtn: {
    marginTop: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  permissionBtnText: { color: "white", fontWeight: "700" },

  modeScrollContent: {
    paddingHorizontal: 6,
    paddingVertical: 10,
    alignItems: "center",
    gap: 22,
  },
  modeItem: {alignItems: "center", minWidth: 64,},
  modeText: { color: TEXT_MUTED_CAMERA, fontSize: 16, fontWeight: "600" },
  modeTextSelected: { color: "white" },
  modeUnderline: {
    height: 2,
    width: 52,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  modeUnderlineSelected: { backgroundColor: "white" },

  shutterRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  smallBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  smallBtnIcon: { fontSize: 26, color: "white" },
  smallBtnPlaceholder: { width: 52, height: 52 },

  shutterBtn: { alignItems: "center", justifyContent: "center" },
  shutterOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(255,255,255,0.25)",
  }
});

export const documentStyles = StyleSheet.create({
  listContent: {
    paddingVertical: 8,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.15)",
  },

  thumbWrap: {
    width: 46,
    height: 46,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },

  textCol: { flex: 1 },
  title: { color: "white", fontSize: 15, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.65)", marginTop: 2 },

  chevBtn: { paddingLeft: 10, paddingVertical: 6 },
  chev: { color: "rgba(255,255,255,0.75)", fontSize: 28, lineHeight: 28 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyTitle: { color: "white", fontSize: 18, fontWeight: "800", marginBottom: 8 },
  emptyText: { color: "rgba(255,255,255,0.7)", textAlign: "center" },
});