export interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { name: 'Côte d’Ivoire', code: 'CI', dialCode: '+225', flag: '🇨🇮' },
  { name: 'Sénégal', code: 'SN', dialCode: '+221', flag: '🇸🇳' },
  { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷' },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦' },
  { name: 'États-Unis', code: 'US', dialCode: '+1', flag: '🇺🇸' },
  { name: 'Cameroun', code: 'CM', dialCode: '+237', flag: '🇨🇲' },
  { name: 'Mali', code: 'ML', dialCode: '+223', flag: '🇲🇱' },
  { name: 'Burkina Faso', code: 'BF', dialCode: '+226', flag: '🇧🇫' },
  { name: 'Bénin', code: 'BJ', dialCode: '+229', flag: '🇧🇯' },
  { name: 'Togo', code: 'TG', dialCode: '+228', flag: '🇹🇬' },
  { name: 'Gabon', code: 'GA', dialCode: '+241', flag: '🇬🇦' },
  { name: 'Congo', code: 'CG', dialCode: '+242', flag: '🇨🇬' },
  { name: 'RDC', code: 'CD', dialCode: '+243', flag: '🇨🇩' },
  { name: 'Guinée', code: 'GN', dialCode: '+224', flag: '🇬🇳' },
  { name: 'Maroc', code: 'MA', dialCode: '+212', flag: '🇲🇦' },
  { name: 'Algérie', code: 'DZ', dialCode: '+213', flag: '🇩🇿' },
  { name: 'Tunisie', code: 'TN', dialCode: '+216', flag: '🇹🇳' },
];
