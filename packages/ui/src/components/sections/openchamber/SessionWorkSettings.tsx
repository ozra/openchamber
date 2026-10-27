import React from 'react';
import { SettingsCheckboxRow, SettingsSection, SETTINGS_OPTION_STACK_CLASS } from '@/components/sections/shared/SettingsSection';
import { isVSCodeRuntime } from '@/lib/desktop';
import { useDeviceInfo } from '@/lib/device';
import { useI18n } from '@/lib/i18n';
import { updateDesktopSettings } from '@/lib/persistence';
import { useSessionDisplayStore } from '@/stores/useSessionDisplayStore';
import { useUIStore } from '@/stores/useUIStore';

/**
 * Sidebar display and actions: the Chats section, quick archive and "In work" (the sidebar block,
 * the Track / Done actions, and sessions going in on a sent message). Jev
 * decides nothing here (it only hints that work looks done, which the info
 * explains), so no Jev access note.
 */
export const SessionWorkSettings: React.FC = () => {
  const { t } = useI18n();
  const { isMobile } = useDeviceInfo();
  const enabled = useUIStore((state) => state.sessionWorkEnabled);
  const setEnabled = useUIStore((state) => state.setSessionWorkEnabled);
  const showChatsSection = useSessionDisplayStore((state) => state.showChatsSection);
  const setShowChatsSection = useSessionDisplayStore((state) => state.setShowChatsSection);
  const showArchiveButton = useSessionDisplayStore((state) => state.showArchiveButton);
  const setShowArchiveButton = useSessionDisplayStore((state) => state.setShowArchiveButton);

  return (
    <SettingsSection
      title={t('settings.layout.sessions.sidebar.title')}
      settingsItem="sessions.work"
      contentClassName={SETTINGS_OPTION_STACK_CLASS}
    >
      {isVSCodeRuntime() ? null : (
        <SettingsCheckboxRow
          settingsItem="sessions.show-chats"
          checked={showChatsSection}
          onChange={(checked) => {
            setShowChatsSection(checked);
            void updateDesktopSettings({ sidebarShowChatsSection: checked });
          }}
          label={t('settings.openchamber.defaults.field.showChats')}
          ariaLabel={t('settings.openchamber.defaults.field.showChats')}
        />
      )}
      {isMobile ? null : (
        <SettingsCheckboxRow
          settingsItem="sessions.show-archive-button"
          checked={showArchiveButton}
          onChange={(checked) => {
            setShowArchiveButton(checked);
            void updateDesktopSettings({ sidebarShowArchiveButton: checked });
          }}
          label={t('settings.openchamber.sidebar.showArchiveButton')}
          ariaLabel={t('settings.openchamber.sidebar.showArchiveButton')}
          info={t('settings.openchamber.sidebar.showArchiveButtonInfo')}
        />
      )}
      <SettingsCheckboxRow
        settingsItem="sessions.work-enabled"
        checked={enabled}
        onChange={setEnabled}
        label={t('settings.openchamber.sessionWork.field.enabled')}
        ariaLabel={t('settings.openchamber.sessionWork.field.enabled')}
        info={t('settings.openchamber.sessionWork.info')}
      />
    </SettingsSection>
  );
};
