export class PhoneService {
  /**
   * Normalizes a phone number to E.164 format.
   * Standard industrial normalization for African and International markets.
   */
  static normalizePhoneNumber(phone: string, dialCode: string): string {
    let cleaned = phone.replace(/[^0-9]/g, '');
    cleaned = cleaned.replace(/^0+/, '');
    const dialCodeDigits = dialCode.replace(/[^0-9]/g, '');
    if (cleaned.startsWith(dialCodeDigits)) {
      return '+' + cleaned;
    }
    return '+' + dialCodeDigits + cleaned;
  }
}
