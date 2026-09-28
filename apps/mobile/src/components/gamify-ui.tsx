import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import type { PropsWithChildren, ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  Text,
  type TextProps,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type ThemeMode = 'dark' | 'light';

export const palette = {
  dark: {
    bg: '#231A2B',
    overlay: '#1A1320',
    surface: '#2A2035',
    raised: '#33263F',
    sunken: '#241C2E',
    chrome: '#1E1626',
    border: '#3B2E45',
    borderStrong: '#43334F',
    ink: '#F2ECF6',
    muted: '#AEA1BC',
    dim: '#8C8098',
    subtle: '#6B5E77',
    primary: '#B79BFF',
    primaryDeep: '#8E6EF0',
    primaryText: '#D5C6FF',
    accent: '#F4A98C',
    accentDeep: '#EF8F80',
    accentShadow: '#C9705F',
    success: '#74C79C',
    streak: '#F0B45E',
    og: '#F7D699',
    cardShadow: 'rgba(0,0,0,.28)',
  },
  light: {
    bg: '#FAF6F8',
    overlay: '#F7F0F4',
    surface: '#FFFFFF',
    raised: '#FFFFFF',
    sunken: '#F0E9F2',
    chrome: '#FFFFFF',
    border: '#EBE0EA',
    borderStrong: '#E3D7E2',
    ink: '#2C2135',
    muted: '#6E6379',
    dim: '#948AA0',
    subtle: '#A69BAD',
    primary: '#7B5CE6',
    primaryDeep: '#5B3FC0',
    primaryText: '#654CC8',
    accent: '#EF927B',
    accentDeep: '#E2765F',
    accentShadow: '#C9604A',
    success: '#32936F',
    streak: '#BE7B16',
    og: '#F7D699',
    cardShadow: 'rgba(56,35,65,.08)',
  },
} as const;

export type Palette = (typeof palette)[ThemeMode];

const fontFamilies = {
  400: 'JakartaRegular',
  500: 'JakartaMedium',
  600: 'JakartaSemiBold',
  700: 'JakartaBold',
  800: 'JakartaExtraBold',
} as const;

type Weight = keyof typeof fontFamilies;

export function GText({
  weight = 500,
  style,
  ...props
}: TextProps & { weight?: Weight }) {
  return <Text {...props} style={[{ fontFamily: fontFamilies[weight] }, style]} />;
}

export function ScreenFrame({
  mode,
  children,
  background,
}: PropsWithChildren<{ mode: ThemeMode; background?: string }>) {
  const p = palette[mode];
  return (
    <View style={[styles.viewport, { backgroundColor: p.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView
        edges={['top', 'left', 'right', 'bottom']}
        style={[
          styles.device,
          { backgroundColor: background ?? p.bg },
          Platform.OS === 'web' && styles.webSafeArea,
        ]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

export function ScrollBody({
  children,
  contentStyle,
  backgroundColor,
  bottomInset = 24,
}: PropsWithChildren<{
  contentStyle?: ViewStyle;
  backgroundColor?: string;
  bottomInset?: number;
}>) {
  return (
    <ScrollView
      style={[styles.scroll, backgroundColor ? { backgroundColor } : null]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }, contentStyle]}
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

export function Card({
  p,
  children,
  style,
  raised = false,
  onPress,
}: PropsWithChildren<{
  p: Palette;
  style?: StyleProp<ViewStyle>;
  raised?: boolean;
  onPress?: () => void;
}>) {
  const cardStyle = [
    styles.card,
    {
      backgroundColor: raised ? p.raised : p.surface,
      borderColor: p.border,
      shadowColor: p.cardShadow,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [cardStyle, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

export function GradientCard({
  children,
  style,
  colors,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; colors: readonly [string, string, ...string[]] }>) {
  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style}>
      {children}
    </LinearGradient>
  );
}

export function PrimaryButton({
  label,
  onPress,
  p,
  compact = false,
  style,
}: {
  label: string;
  onPress: () => void;
  p: Palette;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.buttonShadow, { backgroundColor: p.accentShadow }, style, pressed && styles.pressed]}>
      <LinearGradient
        colors={[p.accent, p.accentDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.primaryButton, compact && styles.compactButton]}>
        <GText weight={800} style={[styles.buttonText, { color: palette.dark.bg }]}>
          {label}
        </GText>
      </LinearGradient>
    </Pressable>
  );
}

export function BackButton({ p, onPress }: { p: Palette; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Go back"
      onPress={onPress}
      style={({ pressed }) => [
        styles.backButton,
        { backgroundColor: p.surface, borderColor: p.border },
        pressed && styles.pressed,
      ]}>
      <GText weight={500} style={{ color: p.muted, fontSize: 32, lineHeight: 31 }}>
        ‹
      </GText>
    </Pressable>
  );
}

export function ProgressBar({
  value,
  p,
  color,
  height = 7,
}: {
  value: number;
  p: Palette;
  color?: string;
  height?: number;
}) {
  return (
    <View style={[styles.progressTrack, { backgroundColor: p.sunken, height }]}>
      <View
        style={[
          styles.progressValue,
          { backgroundColor: color ?? p.primary, width: `${Math.max(0, Math.min(100, value))}%` },
        ]}
      />
    </View>
  );
}

export function Toggle({
  on,
  p,
  onPress,
}: {
  on: boolean;
  p: Palette;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.toggle,
        { backgroundColor: on ? p.success : p.borderStrong, justifyContent: on ? 'flex-end' : 'flex-start' },
      ]}>
      <View style={[styles.toggleKnob, { backgroundColor: on ? palette.dark.bg : p.subtle }]} />
    </Pressable>
  );
}

export function Pill({
  label,
  p,
  selected = false,
  showCheck = true,
  onPress,
  style,
}: {
  label: string;
  p: Palette;
  selected?: boolean;
  showCheck?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: selected ? `${p.primary}25` : p.surface,
          borderColor: selected ? p.primary : p.border,
        },
        style,
        pressed && onPress ? styles.pressed : null,
      ]}>
      <GText weight={selected ? 700 : 600} style={{ color: selected ? p.primaryText : p.muted, fontSize: 13 }}>
        {label}
      </GText>
      {selected && showCheck ? (
        <GText weight={800} style={{ color: p.primaryText, fontSize: 13 }}>
          ✓
        </GText>
      ) : null}
    </Pressable>
  );
}

export type MainTab = 'home' | 'explore' | 'create' | 'league' | 'profile';

const tabGlyphs: Record<MainTab, string> = {
  home: '⌂',
  explore: '◉',
  create: '★',
  league: '♜',
  profile: '♙',
};

const tabLabels: Record<MainTab, string> = {
  home: 'Home',
  explore: 'Explore',
  create: 'Continue',
  league: 'League',
  profile: 'Profile',
};

export function BottomNav({
  active,
  p,
  onSelect,
}: {
  active: MainTab;
  p: Palette;
  onSelect: (tab: MainTab) => void;
}) {
  const tabs: MainTab[] = ['home', 'explore', 'create', 'league', 'profile'];
  return (
    <View style={[styles.nav, { backgroundColor: p.chrome, borderTopColor: p.border }]}>
      {tabs.map((tab) => {
        const selected = active === tab;
        if (tab === 'create') {
          return (
            <Pressable key={tab} onPress={() => onSelect(tab)} style={({ pressed }) => [styles.createTab, pressed && styles.pressed]}>
              <LinearGradient colors={[p.accent, p.accentDeep]} style={[styles.createOrb, { borderColor: p.chrome }]}>
                <GText weight={800} style={{ color: palette.dark.bg, fontSize: 31, lineHeight: 36 }}>
                  ★
                </GText>
              </LinearGradient>
              <GText weight={700} style={{ color: p.accent, fontSize: 9.5, marginTop: 1 }}>
                Continue
              </GText>
            </Pressable>
          );
        }
        return (
          <Pressable key={tab} onPress={() => onSelect(tab)} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
            <GText weight={700} style={{ color: selected ? p.primary : p.dim, fontSize: 24, lineHeight: 24 }}>
              {tabGlyphs[tab]}
            </GText>
            <GText weight={700} style={{ color: selected ? p.primary : p.dim, fontSize: 9.5 }}>
              {tabLabels[tab]}
            </GText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function MainScaffold({
  mode,
  active,
  children,
  onSelect,
  noScroll = false,
}: PropsWithChildren<{
  mode: ThemeMode;
  active: MainTab;
  onSelect: (tab: MainTab) => void;
  noScroll?: boolean;
}>) {
  const p = palette[mode];
  return (
    <ScreenFrame mode={mode}>
      {noScroll ? (
        <View style={styles.mainFlex}>{children}</View>
      ) : (
        <ScrollBody contentStyle={styles.mainContent} bottomInset={105}>
          {children}
        </ScrollBody>
      )}
      <BottomNav active={active} p={p} onSelect={onSelect} />
    </ScreenFrame>
  );
}

export function IconTile({
  glyph,
  color,
  backgroundColor,
  size = 38,
  rounded = 13,
  textSize = 18,
}: {
  glyph: string;
  color: string;
  backgroundColor: string;
  size?: number;
  rounded?: number;
  textSize?: number;
}) {
  return (
    <View style={{ width: size, height: size, borderRadius: rounded, backgroundColor, alignItems: 'center', justifyContent: 'center' }}>
      <GText weight={800} style={{ color, fontSize: textSize, lineHeight: textSize + 4 }}>
        {glyph}
      </GText>
    </View>
  );
}

export function SectionTitle({
  children,
  p,
  right,
}: PropsWithChildren<{ p: Palette; right?: ReactNode }>) {
  return (
    <View style={styles.sectionTitleRow}>
      <GText weight={800} style={[styles.sectionTitle, { color: p.ink }]}>
        {children}
      </GText>
      {right}
    </View>
  );
}

export function Overline({ children, p, style }: PropsWithChildren<{ p: Palette; style?: StyleProp<TextStyle> }>) {
  return (
    <GText weight={700} style={[styles.overline, { color: p.dim }, style]}>
      {children}
    </GText>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    alignItems: 'center',
  },
  device: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    overflow: 'hidden',
  },
  webSafeArea: {
    paddingTop: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  mainContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  mainFlex: {
    flex: 1,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 2,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  buttonShadow: {
    borderRadius: 18,
    paddingBottom: 6,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  compactButton: {
    minHeight: 48,
  },
  buttonText: {
    fontSize: 15.5,
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressValue: {
    height: '100%',
    borderRadius: 999,
  },
  toggle: {
    width: 48,
    height: 29,
    borderRadius: 999,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleKnob: {
    width: 21,
    height: 21,
    borderRadius: 999,
  },
  pill: {
    minHeight: 38,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  nav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 86,
    paddingHorizontal: 10,
    paddingBottom: Platform.OS === 'web' ? 13 : 5,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  tab: {
    width: 58,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  createTab: {
    width: 74,
    alignItems: 'center',
  },
  createOrb: {
    width: 68,
    height: 68,
    borderRadius: 23,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    letterSpacing: -0.2,
  },
  overline: {
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
