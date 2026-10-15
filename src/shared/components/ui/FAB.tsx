import React from 'react';
import { Pressable, StyleSheet, ViewStyle, Text, Animated, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useColors } from '@shared/theme';

export interface FABProps {
  icon: string;
  label?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'surface';
  size?: 'small' | 'regular' | 'large';
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  style?: ViewStyle;
  disabled?: boolean;
}

export function FAB({
  icon,
  label,
  onPress,
  variant = 'primary',
  size = 'regular',
  position = 'bottom-right',
  style,
  disabled = false,
}: FABProps) {
  const colors = useColors();

  const getColors = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: colors.primary,
          icon: colors.primaryForeground,
        };
      case 'secondary':
        return {
          bg: colors.secondary,
          icon: colors.secondaryForeground,
        };
      case 'surface':
        return {
          bg: colors.card,
          icon: colors.primary,
        };
      default:
        return {
          bg: colors.primary,
          icon: colors.primaryForeground,
        };
    }
  };

  const getSizeValues = () => {
    switch (size) {
      case 'small':
        return { size: 40, iconSize: 20, padding: 8 };
      case 'large':
        return { size: 64, iconSize: 28, padding: 16 };
      default:
        return { size: 56, iconSize: 24, padding: 16 };
    }
  };

  const getPosition = (): ViewStyle => {
    const base: ViewStyle = { position: 'absolute', bottom: 24 };
    switch (position) {
      case 'bottom-left':
        return { ...base, left: 24 };
      case 'bottom-center':
        return { ...base, alignSelf: 'center', left: '50%', marginLeft: -28 };
      default:
        return { ...base, right: 24 };
    }
  };

  const fabColors = getColors();
  const sizeValues = getSizeValues();
  const isExtended = !!label;

  const fabStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: fabColors.bg,
    borderRadius: isExtended ? 16 : sizeValues.size / 2,
    height: sizeValues.size,
    minWidth: sizeValues.size,
    paddingHorizontal: isExtended ? 20 : 0,
    gap: isExtended ? 8 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 999,
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[fabStyle, getPosition(), style]}
    >
      <Ionicons name={icon} size={sizeValues.iconSize} color={fabColors.icon} />
      {label && <Text style={[styles.label, { color: fabColors.icon }]}>{label}</Text>}
    </Pressable>
  );
}

export interface FABGroupProps {
  mainIcon: string;
  actions: Array<{
    icon: string;
    label: string;
    onPress: () => void;
  }>;
  open: boolean;
  onToggle: () => void;
  style?: ViewStyle;
}

export function FABGroup({ mainIcon, actions, open, onToggle, style }: FABGroupProps) {
  const colors = useColors();

  return (
    <>
      {open && <Pressable style={styles.backdrop} onPress={onToggle} />}
      <Animated.View style={[styles.groupContainer, style]}>
        {open &&
          actions.map((action, index) => (
            <Animated.View key={index} style={[styles.actionContainer, { bottom: (index + 1) * 64 }]}>
              <Text
                style={[
                  styles.actionLabel,
                  {
                    color: colors.foreground,
                    backgroundColor: colors.card,
                  },
                ]}
              >
                {action.label}
              </Text>
              <FAB
                icon={action.icon}
                size="small"
                variant="surface"
                onPress={() => {
                  action.onPress();
                  onToggle();
                }}
                style={styles.actionFab}
              />
            </Animated.View>
          ))}
        <FAB icon={open ? 'close' : mainIcon} onPress={onToggle} style={styles.mainFab} />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  groupContainer: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    alignItems: 'flex-end',
  },
  actionContainer: {
    position: 'absolute',
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionLabel: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
    fontSize: 14,
    fontWeight: '500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionFab: {
    position: 'relative',
    bottom: 0,
    right: 0,
  },
  mainFab: {
    position: 'relative',
    bottom: 0,
    right: 0,
  },
});

export default FAB;
