import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Bildirim davranışını ayarla
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private notificationIdentifier: string | null = null;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Bildirim servisini başlat
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Bildirim izinlerini kontrol et ve iste
      const hasPermission = await this.requestPermissions();
      
      if (hasPermission) {
        // Mevcut zamanlanmış bildirimleri kontrol et
        await this.checkAndScheduleNotifications();
        this.isInitialized = true;
        console.log('NotificationService başarıyla başlatıldı');
      } else {
        console.log('Bildirim izni verilmedi');
      }
    } catch (error) {
      console.error('NotificationService başlatılırken hata:', error);
    }
  }

  /**
   * Bildirim izinlerini iste
   */
  private async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Varsayılan',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#1e293b',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.error('Bildirim izni istenirken hata:', error);
      return false;
    }
  }

  /**
   * Günlük gider hatırlatma bildirimini zamanla
   */
  async scheduleDailyExpenseReminder(): Promise<void> {
    try {
      // Mevcut bildirimi iptal et
      if (this.notificationIdentifier) {
        await Notifications.cancelScheduledNotificationAsync(this.notificationIdentifier);
      }

      // Her gün saat 21:00'da bildirim zamanla
      this.notificationIdentifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'ParamıYönet',
          body: 'Bugünkü giderlerinizi girdiniz mi? Hemen kontrol edin! 💰',
          sound: 'default',
          data: {
            type: 'daily_expense_reminder',
            timestamp: Date.now(),
          },
        },
        trigger: {
          hour: 21,
          minute: 0,
          repeats: true,
        } as Notifications.CalendarTriggerInput,
      });

      // Bildirim ID'sini kaydet
      await AsyncStorage.setItem('expenseReminderNotificationId', this.notificationIdentifier);
      
      console.log('Günlük gider hatırlatma bildirimi zamanlandı:', this.notificationIdentifier);
    } catch (error) {
      console.error('Bildirim zamanlanırken hata:', error);
    }
  }

  /**
   * Günlük gider hatırlatma bildirimini iptal et
   */
  async cancelDailyExpenseReminder(): Promise<void> {
    try {
      if (this.notificationIdentifier) {
        await Notifications.cancelScheduledNotificationAsync(this.notificationIdentifier);
        await AsyncStorage.removeItem('expenseReminderNotificationId');
        this.notificationIdentifier = null;
        console.log('Günlük gider hatırlatma bildirimi iptal edildi');
      }
    } catch (error) {
      console.error('Bildirim iptal edilirken hata:', error);
    }
  }

  /**
   * Bildirim durumunu kontrol et ve gerekirse zamanla
   */
  private async checkAndScheduleNotifications(): Promise<void> {
    try {
      // Kayıtlı bildirim ID'sini kontrol et
      const savedNotificationId = await AsyncStorage.getItem('expenseReminderNotificationId');
      
      if (savedNotificationId) {
        // Mevcut zamanlanmış bildirimleri kontrol et
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        const existingNotification = scheduledNotifications.find(
          notification => notification.identifier === savedNotificationId
        );

        if (existingNotification) {
          this.notificationIdentifier = savedNotificationId;
          console.log('Mevcut bildirim bulundu:', savedNotificationId);
          return;
        }
      }

      // Bildirim yoksa yeni bir tane zamanla
      await this.scheduleDailyExpenseReminder();
    } catch (error) {
      console.error('Bildirim kontrol edilirken hata:', error);
    }
  }

  /**
   * Bildirim ayarlarının durumunu kontrol et
   */
  async isNotificationEnabled(): Promise<boolean> {
    try {
      const savedNotificationId = await AsyncStorage.getItem('expenseReminderNotificationId');
      return !!savedNotificationId;
    } catch (error) {
      console.error('Bildirim durumu kontrol edilirken hata:', error);
      return false;
    }
  }

  /**
   * Bildirim ayarlarını aç/kapat
   */
  async toggleNotifications(enabled: boolean): Promise<void> {
    try {
      if (enabled) {
        await this.scheduleDailyExpenseReminder();
      } else {
        await this.cancelDailyExpenseReminder();
      }
    } catch (error) {
      console.error('Bildirim ayarları değiştirilirken hata:', error);
    }
  }



  /**
   * Tüm zamanlanmış bildirimleri listele (debug amaçlı)
   */
  async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Zamanlanmış bildirimler alınırken hata:', error);
      return [];
    }
  }
}

export default NotificationService; 