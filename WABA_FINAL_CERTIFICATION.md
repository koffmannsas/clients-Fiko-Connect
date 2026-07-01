# WABA FINAL CERTIFICATION - V6.0

## Meta API Integration
- **Interactive Payloads**: `sendMessage` now accepts full Meta JSON payloads (templates, buttons, lists).
- **Auto-Normalization**: String messages are automatically converted to valid Meta "text" objects.
- **Quota Enforcement**: Every message sent checks and increments the subscription quota.
- **WABA Vault**: Token and PhoneID retrieval is industrialized via `FirestoreRepo`.

## Features
- Templates support.
- Interactive Buttons support.
- Real-time delivery logging in `messages` collection.
- Error handling with axios for robust API communication.
