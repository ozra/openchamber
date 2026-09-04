import React from 'react';
import {
  SettingsSection,
  SettingsCheckboxRow,
} from '@/components/sections/shared/SettingsSection';
import { useUIStore } from '@/stores/useUIStore';
import { updateDesktopSettings } from '@/lib/persistence';
import { useI18n } from '@/lib/i18n';

/**
 * Sidebar behavior settings (PRD-014 / PRD-015 fork work).
 *
 * - Hide the header "New session" button (opt-in).
 * - Show project/group action icons at rest (opt-in fork default).
 *
 * The keep-open vs auto-close behavior is controlled from the sidebar itself
 * (the pin in the sidebar toolbar), not from Settings.
 */
export const SidebarSettings: React.FC = () => {
  const { t } = useI18n();
  const sidebarHideHeaderNewSession = useUIStore((state) => state.sidebarHideHeaderNewSession);
  const setSidebarHideHeaderNewSession = useUIStore((state) => state.setSidebarHideHeaderNewSession);
  const sidebarActionsAlwaysVisible = useUIStore((state) => state.sidebarActionsAlwaysVisible);
  const setSidebarActionsAlwaysVisible = useUIStore((state) => state.setSidebarActionsAlwaysVisible);

  const handleHideHeaderNewSessionChange = React.useCallback((enabled: boolean) => {
    setSidebarHideHeaderNewSession(enabled);
    void updateDesktopSettings({ sidebarHideHeaderNewSession: enabled });
  }, [setSidebarHideHeaderNewSession]);

  const handleActionsAlwaysVisibleChange = React.useCallback((enabled: boolean) => {
    setSidebarActionsAlwaysVisible(enabled);
    void updateDesktopSettings({ sidebarActionsAlwaysVisible: enabled });
  }, [setSidebarActionsAlwaysVisible]);

  return (
    <SettingsSection
      title={t('settings.openchamber.sidebar.title')}
      info={t('settings.openchamber.sidebar.tooltip')}
    >
      <SettingsCheckboxRow
        settingsItem="appearance.sidebar-hide-header-new-session"
        checked={sidebarHideHeaderNewSession}
        onChange={handleHideHeaderNewSessionChange}
        label={t('settings.openchamber.sidebar.field.hideHeaderNewSession')}
        ariaLabel={t('settings.openchamber.sidebar.field.hideHeaderNewSessionAria')}
        info={t('settings.openchamber.sidebar.field.hideHeaderNewSessionHint')}
      />

      <SettingsCheckboxRow
        settingsItem="appearance.sidebar-actions-always-visible"
        checked={sidebarActionsAlwaysVisible}
        onChange={handleActionsAlwaysVisibleChange}
        label={t('settings.openchamber.sidebar.field.actionsAlwaysVisible')}
        ariaLabel={t('settings.openchamber.sidebar.field.actionsAlwaysVisibleAria')}
        info={t('settings.openchamber.sidebar.field.actionsAlwaysVisibleHint')}
      />
    </SettingsSection>
  );
};