export class PhoneService {
  /**
   * Normalizes a phone number to E.164 format.
   * Handles local formats for Africa (e.g. Ivory Coast) and international.
   */
  static normalize(phone: string, dialCode: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/[^0-9]/g, '');

    // Remove leading zeros
    cleaned = cleaned.replace(/^0+/, '');

    const dialCodeDigits = dialCode.replace(/[^0-9]/g, '');

    // If the number already starts with the dial code, don't prepend it again
    if (cleaned.startsWith(dialCodeDigits)) {
      return '+' + cleaned;
    }

    return '+' + dialCodeDigits + cleaned;
  }
}
