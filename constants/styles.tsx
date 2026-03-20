import { Dimensions, StyleSheet } from 'react-native';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

const BG = "#0B1020";
const ACCENT = "#E9C6A6";
const TAB_ACTIVE = "#C97E6F";
const TAB_INACTIVE = "#E9C6A6";
const CARD_BORDER = "#2C9AA4";
const PAPER = "#FFFFF2";
const BADGE = "#B65A43";
const CTA = "#2C9AA4";
const PREVIEW_BG = "#C8D7F0";
const TEXT_MUTED = "rgba(255,255,255,0.65)";

//========= GENERAL STYLES =========//

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
    paddingHorizontal: 0,
    marginTop: 0
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
    width: 60,
    height: 60,
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
    width: "95%",
    marginTop: 8,
    marginBottom: 12
  },
  dashBookmark: {
    position: "absolute",
    right: 18,
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
    width: "100%",
    backgroundColor: "#fffffff2",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
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
    marginTop: 10,
    marginHorizontal: 10,
    gap: 12
  },
  dashShortcutCardOuter: {
    flex: 1,
    borderRadius: 14,
    //borderWidth: 3,
    backgroundColor: "rgba(233,198,166,0.9)",
    padding: 6,
    marginLeft: 0,
    marginRight: 0,
    minHeight: 240,
    //width: 150,
    justifyContent: 'center',
    alignItems: 'center'
  },
  dashShortcutCardInnerOuter: {
    flex: 1,
    borderRadius: 14,
    //borderWidth: 3,
    backgroundColor: "#277A8C",
    padding: 6,
    //height: 180,
    //width: 140,
    justifyContent: 'center',
    alignItems: 'center'
  },
  dashShortcutCard: {
    flex: 1,
    backgroundColor: "#fffffff2",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    //height: 170,
    //width: 130,
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
  dashBulletGroup: { gap: 6, marginBottom: 10, flexGrow: 1, alignSelf: "stretch" },
  dashBullet: { color: "#1F1F1F", fontSize: 12, fontWeight: "600", textAlign: "left" },

  dashViewAllBtn: {
    marginTop: 12,
    alignSelf: "stretch", 
    backgroundColor: "#fffffff2",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00000014",
    width: "100%",
    justifyContent: "center",
  },
  dashViewAllText: { color: "#222", fontWeight: "900", marginRight: 8 },
  dashViewAllArrow: { color: "#222", fontSize: 18, fontWeight: "900" },

  dashLoginWrap: {
    paddingHorizontal: 18,
    marginTop: 10,
    paddingBottom: 8
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

//========= READER SCREEN STYLES =========//
export const readerPalette = {
  light: {
    indicator: "black",
    scrollIndicator: "black" as const,

    bodyText: "#1B1B1B",
    mutedText: "rgba(0,0,0,0.70)",
    placeholder: "rgba(0,0,0,0.55)",

    icon: "#1B1B1B",
    iconDisabled: "transparent",

    modalBackdrop: "rgba(0,0,0,0.55)",
    modalCardBg: "#FFFFF2",

    badgeLang: "#F2D3AC",

    paperIconBg: "#ECC8AF",
    paperIconBorder: "rgba(0,0,0,0.5)",

    levelIcon: "#1B1B1B",

    cardBorder: "#2C9AA4",

    complexWord: "#8C311C",

    badgeNotch: "#FFFFF2",

    midCard: "#2C9AA4",
    outerBorder: "#F2A679"
  },
  dark: {
    indicator: "#E5E7EB",
    scrollIndicator: "white" as const,

    bodyText: "#E5E7EB",
    mutedText: "rgba(229,231,235,0.70)",
    placeholder: "rgba(229,231,235,0.55)",

    icon: "#E5E7EB",
    iconDisabled: "transparent",

    modalBackdrop: "rgba(0,0,0,0.70)",
    modalCardBg: "#2B2B2B",

    badgeLang: "#F2D3AC",

    paperIconBg: "rgba(255,255,255,0.10)",
    paperIconBorder: "rgba(255,255,255,0.16)",

    levelIcon: "#E5E7EB",

    cardBorder: "#809BCE",

    complexWord: "#F2D3AC",

    badgeNotch: "#2B2B2B",

    midCard: "#6B8FD6",
    outerBorder: "#604D53"
  },
} as const;


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

  langPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 44,
    width: "60%",
    borderRadius: 12,
    backgroundColor: TAB_ACTIVE,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.25)",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
    zIndex: 60
  },
  langPickerBtnText: {
    fontWeight: "900",
    color: "#1B1B1B",
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

  paperTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    maxWidth: "75%",
  },

  helpFab: {
    width: 40,
    height: 40,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: "center",
    alignContent: "center",
    alignItems: "center",
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

  pageMeta: {
    marginTop: 8,
    marginBottom: 2,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center"
  },
  pageBlock: {
    marginBottom: 22
  },
  pageTitle: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8,
    letterSpacing: 0.8
  },

  ctaBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: CTA,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 }
  },
  ctaText: { color: "white", fontWeight: "900", fontSize: 16 },

  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14
  },
  ttsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },

  ttsBtn: {
    height: 46,
    width: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CTA
  },
  shareBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  shareBtn: {
    height: 46,
    width: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CTA
  },
  shareBtnDisabled: { opacity: 0.35 },

  ttsStopBtn: { backgroundColor: CTA },

  ttsBtnDisabled: { opacity: 0.35 },

  translateControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },

  complexWord: {
    color: '#8C311C',
    fontWeight: '800',
    textDecorationLine: 'underline',
    fontSize: 16.67,
    lineHeight: 24,
    flexShrink: 1,
    flexWrap: 'wrap'
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

  translateControlsWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 10,
    zIndex: 50,
    elevation: 50
  },
  langModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: "center",
    padding: 16
  },
  langModalCenter: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center"
  },
  langModalCard: {
    width: "100%",
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
    padding: 14
  },
  langModalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1B1B1B",
    marginBottom: 10
  },
  langSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.18)",
    paddingHorizontal: 10,
    height: 44,
    backgroundColor: "rgba(0,0,0,0.04)",
    marginBottom: 10
  },
  langSearchInput: {
    flex: 1,
    fontWeight: "700",
    color: "#1B1B1B"
  },
  langCurrent: {
    fontWeight: "700",
    color: "rgba(0,0,0,0.7)",
    marginBottom: 10
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    backgroundColor: "rgba(0,0,0,0.02)",
    marginBottom: 8
  },
  langRowSelected: {
    borderColor: "rgba(44,154,164,0.6)",
    backgroundColor: "rgba(44,154,164,0.08)"
  },
  langRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  langCode: {
    width: 40,
    fontWeight: "900",
    color: "#1B1B1B"
  },
  langName: {
    fontWeight: "800",
    color: "#1B1B1B"
  },
  langCloseBtn: {
    marginTop: 6,
    height: 46,
    borderRadius: 12,
    backgroundColor: TAB_INACTIVE,
    borderWidth: 1,
    borderColor: "#1B1B1B",
    alignItems: "center",
    justifyContent: "center"
  },
  langCloseBtnText: {
    fontWeight: "900",
    color: "#1B1B1B"
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
    zIndex: 2
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
  calibBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0
  },
  calibCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    zIndex: 1
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
  },

  helpHeaderText: {
    fontWeight: '800',
    fontSize: 20,
    justifyContent: 'center',
    textAlign: 'center'
  }
});

export const readerDarkStyles = StyleSheet.create({
  safe: {
    backgroundColor: "#0B1220",
  },
  container: {
    backgroundColor: "#0B1220",
  },

  outerCard: {
    backgroundColor: "#604D53",
  },
  innerPaper: {
    backgroundColor: "#2B2B2B",
  },
  badgeNotch: {
    borderBottomColor: "#809BCE",
  },

  headerTitle: {
    color: "#E5E7EB",
  },
  bodyText: {
    color: "#E5E7EB",
  },
  complexWord: {
    color: "#F2D3AC",
  },

  actionItemBtn: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.16)",
  },
  actionItemBtnDisabled: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  helpFab: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.16)",
  },

  ctaBtn: {
    backgroundColor: "#6B8FD6",
  },
  ctaText: {
    color: "#0B1220",
  },
  ctaBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.10)",
    opacity: 0.5,
  },

  ttsBtn: { backgroundColor: "#6B8FD6" },

  ttsStopBtn: { backgroundColor: "#6B8FD6" },

  ttsBtnDisabled: { opacity: 0.35 },

  shareBtn: { backgroundColor: "#6B8FD6"  },

  shareBtnDisabled: { opacity: 0.35 },


  levelTabActive: {
    backgroundColor: "rgba(107,143,214,0.35)",
  },
  levelTabInactive: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  levelTabText: {
    color: "#E5E7EB",
  },
  levelTabHint: {
    color: "#E5E7EB",
  },

  langPickerBtn: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.16)",
  },
  langPickerBtnText: {
    color: "#E5E7EB",
  },

  langModalBg: {
    backgroundColor: "rgba(0,0,0,0.70)",
  },
  langModalCard: {
    backgroundColor: "#0F172A",
  },
  langModalTitle: {
    color: "#E5E7EB",
  },
  langSearchWrap: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
  },
  langSearchInput: {
    color: "#E5E7EB",
  },
  langCurrent: {
    color: "rgba(229,231,235,0.70)",
  },
  langRow: {
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  langCode: {
    color: "#E5E7EB",
  },
  langName: {
    color: "#E5E7EB",
  },

  calibBackground: {
    backgroundColor: "rgba(0,0,0,0.70)",
  },
  calibModalCard: {
    backgroundColor: "#0F172A",
  },
  calibTitle: {
    color: "#E5E7EB",
  },
  calibLoadTxt: {
    color: "#E5E7EB",
  },
  calibOpt: {
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  calibOptHeader: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  calibOptHeaderTxt: {
    color: "#E5E7EB",
  },
  calibOptTxt: {
    color: "#E5E7EB",
  },

  definitionBackground: {
    backgroundColor: "rgba(0,0,0,0.70)",
  },
  definitionModalCard: {
    backgroundColor: "#0F172A",
    borderColor: "rgba(255,255,255,0.14)",
  },
  definitionModalWordText: {
    color: "#E5E7EB",
  },
  definitionModalDefinitionText: {
    color: "#E5E7EB",
  },
});

//========= CAMERA SCREEN STYLES =========//

export const cameraStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG, paddingHorizontal: 16 },

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
    color: ACCENT,
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
    backgroundColor: PREVIEW_BG,
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
  modeItem: { alignItems: "center", minWidth: 64, },
  modeText: { color: TEXT_MUTED, fontSize: 16, fontWeight: "600" },
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

//========= DOCUMENTS SCREEN STYLES =========//

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

//========= PROFILE SCREEN STYLES =========//

export const profileStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    paddingBottom: 8,
  },

  header: {
    paddingTop: 8,
    paddingBottom: 18,
    alignItems: "center",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginTop: 6,
  },

  avatarWrap: {
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 46, // match avatarCircle borderRadius
  },
  pickProfileButton: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1F7A88",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  section: {
    paddingHorizontal: 18,
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
    textAlign: "center",
  },

  card: {
    backgroundColor: "#E9E6F4",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowPressed: { opacity: 0.75 },
  rowDisabled: {
    backgroundColor: "rgba(229,231,235,0.6)",
    opacity: 0.55
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  rowLabelDisabled: {
    color: "#6B7280",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  languageChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.15)",
  },
  languageChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },

  oauthHint: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: -4,
    marginBottom: 8,
    fontWeight: "700",
    paddingHorizontal: 18,
  },

  accountModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
  },

  accountModalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },

  detailRow: {
    paddingVertical: 10,
  },

  detailLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#6B7280",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  detailValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  detailDivider: {
    height: 1,
    backgroundColor: "rgba(17,24,39,0.1)",
  },

  detailCloseButton: {
    marginTop: 14,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },

  detailCloseButtonText: {
    color: "#111827",
    fontWeight: "900",
  },

  logoutButton: {
    marginTop: 6,
    marginHorizontal: 18,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: "#1F7A88",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  logoutButtonPressed: { opacity: 0.85 },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  dangerTitle: {
    marginTop: 14,
    textAlign: "center",
    fontWeight: "900",
    color: "#B42318",
    letterSpacing: 0.7,
  },
  dangerWrap: {
    marginTop: 10,
    marginHorizontal: 18,
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(180,35,24,0.55)",
    borderStyle: "dashed",
    backgroundColor: "rgba(255,255,255,0.55)",
  },

  deleteButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#8B2C1B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  deleteButtonPressed: { opacity: 0.85 },
  deleteText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  rowDanger: {},
  rowLabelDanger: {
    color: "#B42318",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  dropdownCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 10,
    overflow: "hidden",
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(17,24,39,0.1)",
  },
  dropdownRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownRowSelected: {
    backgroundColor: "rgba(31, 122, 136, 0.08)",
  },
  dropdownRowText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  pwModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
  },
  pwModalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
    marginTop: 8,
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
  },
  modalError: {
    marginTop: 10,
    color: "#B42318",
    fontWeight: "800",
  },

  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonPressed: {
    opacity: 0.85,
  },
  modalCancelButton: {
    backgroundColor: "#E5E7EB",
  },
  modalCancelButtonText: {
    color: "#111827",
    fontWeight: "900",
  },
  modalButtonPrimary: {
    backgroundColor: "#1F7A88",
  },
  modalButtonPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },

  fullFill: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    width: "100%",
    height: "100%",
  },
  calibBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  calibModalCard: {
    width: '100%',
    maxWidth: 420,
    height: "78%",
    backgroundColor: PAPER,
    borderRadius: 18,
    borderWidth: 10,
    borderColor: CARD_BORDER,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    overflow: "hidden",
    zIndex: 2
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
  calibBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0
  },
  calibCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    zIndex: 1
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

//========= SETTINGS SCREEN STYLES =========//

export const settingsStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  container: {
    padding: 24,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  list: {
    width: '100%',
    maxWidth: 420
  },
  row: {
    minHeight: 44,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  rowLabel: {
    fontSize: 18,
    color: '#000000'
  },
  hint: {
    marginTop: 8,
    fontSize: 13,
    color: "#604D53"
  },

  toggle: {
    width: 54,
    height: 28,
    borderWidth: 4,
    borderColor: '#000000',
    borderRadius: 21,
    backgroundColor: "#E8E1EF",
    padding: 14
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 12,
    backgroundColor: '#F8F4F9',
    borderWidth: 4,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 4
  },
  toggleKnobOn: { 
    right: 4 
  },
  toggleKnobOff: { 
    left: 4 
  },
  toggleDot: {
    width: 12,
    height: 12,
    borderRadius: 99
  },
  sizePill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
    backgroundColor: "#EFE7F3",
    borderRadius: 999,
    paddingHorizontal: 10,
    height: 30,
    gap: 10,
    minWidth: 120,
    justifyContent: "space-between",
  },
  sizeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sizeVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000",
    minWidth: 22,
    textAlign: "center",
  },
  dropdownPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: "#000",
    backgroundColor: "#EFE7F3",
    borderRadius: 999,
    paddingHorizontal: 10,
    height: 30,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000",
  },
  ttsCard: {
    marginTop: 14,
    backgroundColor: "#E8DFF0",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#000",
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  ttsTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000",
    marginBottom: 10,
  },
  ttsRow: {
    marginBottom: 10,
  },
  ttsLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#3B2F35",
    marginBottom: 6,
  },
  slider: {
    width: "100%",
    height: 30,
  },


  modOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 22,
  },
  modCard: {
    backgroundColor: "#F7F1FB",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#000",
    padding: 14,
  },
  modTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000",
    marginBottom: 10,
  },
  modOpt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#EFE7F3",
  },
  modOptSelected: {
    backgroundColor: "#E2D7EC",
  },
  modOptText: {
    fontSize: 15,
    color: "#000",
    fontWeight: "700",
  },
  modClose: {
    marginTop: 6,
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modCloseText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#000",
  },
  
});

//========= MORE DOCUMENTS SCREEN STYLES =========//

export const localStyles = StyleSheet.create({
  listContent: {
    paddingVertical: 8
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.15)"
  },

  mainTap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },

  thumbWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  thumb: {
    width: "100%",
    height: "100%"
  },

  textCol: { flex: 1 },
  title: { color: "white", fontSize: 15, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.65)", marginTop: 2 },

  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  actionTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },

  editTile: { backgroundColor: "#A8B98A" },
  deleteTile: { backgroundColor: "#8B3B2E" },
  tilePressed: { opacity: 0.85 },
  iconBtn: { paddingHorizontal: 10, paddingVertical: 8 },

  chevBtn: { paddingLeft: 10, paddingVertical: 6 },
  chev: { color: "rgba(255,255,255,0.75)", fontSize: 28, lineHeight: 28 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyTitle: { color: "white", fontSize: 18, fontWeight: "800", marginBottom: 8 },
  emptyText: { color: "rgba(255,255,255,0.7)", textAlign: "center" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  modalCard: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "rgba(25,25,25,0.95)",
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)"
  },
  modalTitle: { color: "white", fontSize: 16, fontWeight: "900" },
  modalHint: { marginTop: 6, color: "rgba(255,255,255,0.7)" },

  input: {
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
    color: "white"
  },

  errText: { marginTop: 10, color: "#ffb4b4", fontWeight: "700" },

  modalBtns: { flexDirection: "row", gap: 10, marginTop: 16, justifyContent: "flex-end" },
  btn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth
  },
  btnGhost: { backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.18)" },
  btnPrimary: { backgroundColor: "rgba(255,255,255,0.10)", borderColor: "rgba(255,255,255,0.22)" },
  btnDanger: { backgroundColor: "rgba(255,0,0,0.18)", borderColor: "rgba(255,0,0,0.35)" },
  btnText: { color: "white", fontWeight: "900" }
});