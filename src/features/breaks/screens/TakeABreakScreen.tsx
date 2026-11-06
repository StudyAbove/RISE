import {
  useMemo,
  useState,
} from 'react';

import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useNavigation,
} from '@react-navigation/native';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  BackButton,
} from '../../../components/BackButton';

import {
  colors,
} from '../../../theme/colors';

import {
  textStyles,
} from '../../../theme/typography';

import {
  BreakDetailsCard,
} from '../components/BreakDetailsCard';

import {
  BREAK_CONTENT_WIDTH,
} from '../constants';

import {
  BreakTypeSelector,
} from '../components/BreakTypeSelector';

import {
  StartSessionSlider,
} from '../components/StartSessionSlider';

import {
  getRecommendedBreaks,
} from '../utils/breakRecommendations';

import type {
  BreakType,
} from '../types';

export function TakeABreakScreen() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, 'TakeABreak'>
    >();

  const [
    isBackConfirmationVisible,
    setIsBackConfirmationVisible,
  ] = useState(false);

  const breakOptions =
    useMemo(
      () =>
        getRecommendedBreaks(3),
      [],
    );

  const [
    selectedBreak,
    setSelectedBreak,
  ] = useState<BreakType>(
    breakOptions[0],
  );

  function handleCancelBack() {
    setIsBackConfirmationVisible(
      false,
    );
  }

  function handleConfirmBack() {
    setIsBackConfirmationVisible(
      false,
    );

    navigation.goBack();
  }

  return (
    <SafeAreaView
      style={styles.screen}
    >
      <View
        style={styles.header}
      >
        <BackButton
          onPress={() =>
            setIsBackConfirmationVisible(
              true,
            )
          }
        />

        <Text
          accessibilityRole="header"
          style={styles.title}
        >
          Take a Break
        </Text>

        <View
          style={
            styles.headerSpacer
          }
        />
      </View>

      <View
        style={
          styles.content
        }
      >
        <BreakTypeSelector
          options={breakOptions}
          selectedId={
            selectedBreak.id
          }
          onSelect={
            setSelectedBreak
          }
        />

        {selectedBreak.image && (
          <Image
            source={
              selectedBreak.image
            }
            accessibilityLabel={
              `${selectedBreak.label} break illustration`
            }
            resizeMode="cover"
            style={styles.breakImage}
          />
        )}

        <BreakDetailsCard
          breakType={
            selectedBreak
          }
        />

        <View
          style={
            styles.sliderContainer
          }
        >
          <StartSessionSlider
            key={selectedBreak.id}
            onComplete={() =>
              navigation.replace('BreakSession', {
                breakId: selectedBreak.id,
              })
            }
          />
        </View>
      </View>

      <Modal
        visible={
          isBackConfirmationVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          handleCancelBack
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            <View
              style={
                styles.infoIconOuter
              }
            >
              <View
                style={
                  styles.infoIconInner
                }
              >
                <Text
                  style={
                    styles.infoIconText
                  }
                >
                  i
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.modalTitle
              }
            >
              Are you sure you want to go Back?
            </Text>

            <Text
              style={
                styles.modalMessage
              }
            >
              If you go back, your focus timer will resume from where you paused.
            </Text>

            <View
              style={
                styles.modalActions
              }
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel going back"
                onPress={
                  handleCancelBack
                }
                style={({
                  pressed,
                }) => [
                  styles.modalButton,
                  styles.cancelButton,
                  pressed &&
                    styles.buttonPressed,
                ]}
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm going back"
                onPress={
                  handleConfirmBack
                }
                style={({
                  pressed,
                }) => [
                  styles.modalButton,
                  styles.confirmButton,
                  pressed &&
                    styles.buttonPressed,
                ]}
              >
                <Text
                  style={
                    styles.confirmButtonText
                  }
                >
                  Confirm
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        colors.warmCream,
    },

    header: {
      height: 59,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    title: {
      ...textStyles.screenHeading,
      color:
        colors.deepOlive,
      textAlign: 'center',
      fontSize: 20,
      lineHeight: 24,
      letterSpacing: 0.1,
    },

    headerSpacer: {
      width: 40,
      height: 40,
    },

    content: {
      alignItems: 'center',
      paddingTop: 0,
    },

    breakImage: {
      width:
        BREAK_CONTENT_WIDTH,
      height:
        BREAK_CONTENT_WIDTH,
      marginTop: 14,
      marginBottom: 14,
      borderRadius: 20,
    },

    sliderContainer: {
      marginTop: 14,
      alignItems: 'center',
    },

    modalOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(0, 0, 0, 0.28)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    modalCard: {
      width: 324,
      borderRadius: 16,
      backgroundColor:
        '#FFFFFF',
      paddingTop: 24,
      paddingHorizontal: 24,
      paddingBottom: 24,
      alignItems: 'center',
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 6,
    },

    infoIconOuter: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor:
        'rgba(56, 189, 248, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    infoIconInner: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor:
        'rgba(56, 189, 248, 0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    infoIconText: {
      fontSize: 20,
      lineHeight: 24,
      fontWeight: '700',
      color: '#38BDF8',
      textAlign: 'center',
    },

    modalTitle: {
      marginTop: 12,
      ...textStyles.screenHeading,
      fontSize: 20,
      lineHeight: 27,
      color: '#000000',
      textAlign: 'center',
    },

    modalMessage: {
      width: 276,
      marginTop: 16,
      fontSize: 14,
      lineHeight: 18,
      color: '#71717B',
      textAlign: 'center',
    },

    modalActions: {
      width: 276,
      flexDirection: 'row',
      gap: 8,
      marginTop: 16,
    },

    modalButton: {
      width: 134,
      height: 40,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },

    cancelButton: {
      backgroundColor: '#000000',
    },

    confirmButton: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1.5,
      borderColor: '#000000',
    },

    cancelButtonText: {
      fontSize: 15,
      lineHeight: 18,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    confirmButtonText: {
      fontSize: 15,
      lineHeight: 18,
      fontWeight: '700',
      color: '#000000',
    },

    buttonPressed: {
      opacity: 0.72,
    },
  });
