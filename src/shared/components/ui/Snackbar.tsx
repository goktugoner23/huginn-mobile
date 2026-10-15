import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useColors, spacing, radius, shadow, textStyles } from '@shared/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_WIDTH = 600;

export interface SnackbarProps {
  visible: boolean;
  message: string;
  onDismiss: () => void;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
  variant?: 'default' | 'success' | 'error' | 'warning';
}

export function Snackbar({
  visible,
  message,
  onDismiss,
  duration = 4000,
  action,
  variant = 'default',
}: SnackbarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);
  const [rendered, setRendered] = useState(visible);

  const handleDismiss = useCallback(() => {
    setRendered(false);
    onDismiss();
  }, [onDismiss]);

  const hideSnackbar = useCallback(() => {
    translateY.value = withTiming(100, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });
    opacity.value = withTiming(0, { duration: 200 }, finished => {
      if (finished) {
        runOnJS(handleDismiss)();
      }
    });
  }, [translateY, opacity, handleDismiss]);

  useEffect(() => {
    if (!visible) {
      translateY.value = 100;
      opacity.value = 0;
      return;
    }

    setRendered(true);
    translateY.value = withSpring(0, {
      damping: 20,
      stiffness: 300,
      mass: 0.8,
    });
    opacity.value = withTiming(1, { duration: 200 });

    const timer = setTimeout(() => {
      hideSnackbar();
    }, duration);

    return () => clearTimeout(timer);
  }, [visible, duration, translateY, opacity, hideSnackbar]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const getBackgroundColor = (): string => {
    switch (variant) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.destructive;
      case 'warning':
        return colors.warning;
      default:
        return colors.surface;
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'success':
        return colors.successForeground;
      case 'error':
        return colors.destructiveForeground;
      case 'warning':
        return colors.warningForeground;
      default:
        return colors.foreground;
    }
  };

  const getActionColor = (): string => {
    switch (variant) {
      case 'success':
        return colors.successForeground;
      case 'error':
        return colors.destructiveForeground;
      case 'warning':
        return colors.warningForeground;
      default:
        return colors.primary;
    }
  };

  const handleActionPress = () => {
    action?.onPress();
    hideSnackbar();
  };

  if (!visible && !rendered) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        {
          bottom: insets.bottom + spacing[4],
          left: spacing[4],
          right: spacing[4],
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.snackbar,
          shadow.lg,
          {
            backgroundColor: getBackgroundColor(),
            borderColor: variant === 'default' ? colors.border : 'transparent',
            borderWidth: variant === 'default' ? 1 : 0,
          },
        ]}
      >
        <Text
          style={[
            styles.message,
            textStyles.body,
            { color: getTextColor() },
          ]}
          numberOfLines={2}
        >
          {message}
        </Text>
        {action && (
          <Pressable
            onPress={handleActionPress}
            style={styles.actionButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text
              style={[
                styles.actionLabel,
                textStyles.button,
                { color: getActionColor() },
              ]}
            >
              {action.label}
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 1000,
  },
  snackbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radius.xl,
    gap: spacing[3],
  },
  message: {
    flex: 1,
  },
  actionButton: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: radius.md,
  },
  actionLabel: {
    fontWeight: '600',
  },
});

export default Snackbar;
