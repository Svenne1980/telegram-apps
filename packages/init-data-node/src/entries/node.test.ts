import { describe, expect, it } from 'vitest';
import { TypedError } from '@telegram-apps/toolkit';

import { validate, sign, signData, isValid, hashToken } from './node';
import { arrayBufferToHex } from '../converters/arrayBufferToHex';

const sp = 'user=%7B%22id%22%3A279058397%2C%22first_name%22%3A%22Vladislav%20%2B%20-%20%3F%20%5C%2F%22%2C%22last_name%22%3A%22Kibenko%22%2C%22username%22%3A%22vdkfrost%22%2C%22language_code%22%3A%22ru%22%2C%22is_premium%22%3Atrue%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2F4FPEE4tmP3ATHa57u6MqTDih13LTOiMoKoLDRG4PnSA.svg%22%7D&chat_instance=8134722200314281151&chat_type=private&auth_date=1733584787&signature=zL-ucjNyREiHDE8aihFwpfR9aggP2xiAo3NSpfe-p7IbCisNlDKlo7Kb6G4D0Ao2mBrSgEk4maLSdv6MLIlADQ&hash=2174df5b000556d044f3f020384e879c8efcab55ddea2ced4eb752e93e7080d6';
const spOld = 'auth_date=1&chat_instance=8134722200314281151&chat_type=private&user=%7B%22allows_write_to_pm%22%3Atrue%2C%22first_name%22%3A%22Vladislav+%2B+-+%3F+%2F%22%2C%22id%22%3A279058397%2C%22is_premium%22%3Atrue%2C%22language_code%22%3A%22ru%22%2C%22last_name%22%3A%22Kibenko%22%2C%22photo_url%22%3A%22https%3A%2F%2Ft.me%2Fi%2Fuserpic%2F320%2F4FPEE4tmP3ATHa57u6MqTDih13LTOiMoKoLDRG4PnSA.svg%22%2C%22username%22%3A%22vdkfrost%22%7D&signature=zL-ucjNyREiHDE8aihFwpfR9aggP2xiAo3NSpfe-p7IbCisNlDKlo7Kb6G4D0Ao2mBrSgEk4maLSdv6MLIlADQ&hash=b2e387ba89f433607d2492aad63bb04328b0f3d28585fd149617c8ef129566a2';
const spObject = new URLSearchParams(sp);

const botId = 7342037359;
const secretToken = `${botId}:AAFZehRPBRs8Seg40oDjTMIW8uTGPuW1zfQ`;
const secretTokenHashed = 'c0881d6d547967540dcb06d7378a2c2b2c79a8f915ae70a4a37a8a04de0da32b';

describe('hashToken', () => {
  it('should properly hash token', () => {
    expect(arrayBufferToHex(hashToken('my-secret-token')))
      .toBe('fe37f490481d351837ed49f3b369c886c61013d6d036656fc3c9c92e163e3477');
  });
});

describe('isValid', () => {
  it('should return false if "hash" param is missing', () => {
    expect(isValid('auth_date=1', secretToken)).toBe(false);
  });

  it('should return false if "auth_date" param is missing or does not represent integer', () => {
    expect(isValid('hash=HHH', secretToken)).toBe(false);
    expect(isValid('auth_date=AAA&hash=HHH', secretToken)).toBe(false);
  });

  it('should return false if parameters are expired', () => {
    expect(isValid(sp, secretToken, { expiresIn: 1 })).toBe(false);
  });

  it('should return false if sign is invalid', () => {
    expect(isValid(sp, `${secretToken}A`, { expiresIn: 0 })).toBe(false);
  });

  it('should return true if init data is valid', () => {
    const basicOptions = { expiresIn: 0 };
    const hashedOptions = { ...basicOptions, tokenHashed: true };
    expect(isValid(sp, secretToken, basicOptions)).toBe(true);
    expect(isValid(sp, secretTokenHashed, hashedOptions)).toBe(true);

    expect(isValid(spObject, secretToken, basicOptions)).toBe(true);
    expect(isValid(spObject, secretTokenHashed, hashedOptions)).toBe(true);
  });

  it('should return false if "expiresIn" is not passed and parameters were created more than 1 day ago', () => {
    expect(isValid(spOld, secretToken)).toBe(false);
  });
});

describe('validate', () => {
  it('should throw missing hash error if "hash" param is missing', () => {
    expect(() => validate('auth_date=1', secretToken)).toThrowError(
      new TypedError('ERR_HASH_INVALID', 'Hash is invalid'),
    );
  });

  it('should throw if "auth_date" param is missing or does not represent integer', () => {
    expect(() => validate('hash=HHH', secretToken)).toThrowError(
      new TypedError('ERR_AUTH_DATE_INVALID', 'Auth date is invalid'),
    );
    expect(() => validate('auth_date=AAA&hash=HHH', secretToken)).toThrowError(
      new TypedError('ERR_AUTH_DATE_INVALID', 'Auth date is invalid'),
    );
  });

  it('should throw if parameters are expired', () => {
    expect(() => validate(sp, secretToken, { expiresIn: 1 })).toThrowError(
      new TypedError('ERR_EXPIRED', 'Init data is expired'),
    );
  });

  it('should throw if sign is invalid', () => {
    expect(() => validate(sp, `${secretToken}A`, { expiresIn: 0 })).toThrowError(
      new TypedError('ERR_SIGN_INVALID', 'Sign is invalid'),
    );
  });

  it('should correctly validate parameters in case, they are valid', () => {
    const basicOptions = { expiresIn: 0 };
    const hashedOptions = { ...basicOptions, tokenHashed: true };
    expect(() => validate(sp, secretToken, basicOptions)).not.toThrow();
    expect(() => validate(sp, secretTokenHashed, hashedOptions)).not.toThrow();

    expect(() => validate(spObject, secretToken, basicOptions)).not.toThrow();
    expect(() => validate(spObject, secretTokenHashed, hashedOptions)).not.toThrow();
  });

  it('should throw if "expiresIn" is not passed and parameters were created more than 1 day ago', () => {
    expect(() => validate(spOld, secretToken)).toThrow(
      new TypedError('ERR_EXPIRED', 'Init data is expired'),
    );
  });
});

describe('sign', () => {
  it('should correctly sign data', () => {
    expect(
      sign(
        {
          canSendAfter: 10000,
          chat: {
            id: 1,
            type: 'group',
            username: 'my-chat',
            title: 'chat-title',
            photoUrl: 'chat-photo',
          },
          chatInstance: '888',
          chatType: 'sender',
          queryId: 'QUERY',
          receiver: {
            addedToAttachmentMenu: false,
            allowsWriteToPm: true,
            firstName: 'receiver-first-name',
            id: 991,
            isBot: false,
            isPremium: true,
            languageCode: 'ru',
            lastName: 'receiver-last-name',
            photoUrl: 'receiver-photo',
            username: 'receiver-username',
          },
          startParam: 'debug',
          user: {
            addedToAttachmentMenu: false,
            allowsWriteToPm: false,
            firstName: 'user-first-name',
            id: 222,
            isBot: true,
            isPremium: false,
            languageCode: 'en',
            lastName: 'user-last-name',
            photoUrl: 'user-photo',
            username: 'user-username',
          },
          signature: 'abc',
        },
        '5768337691:AAH5YkoiEuPk8-FZa32hStHTqXiLPtAEhx8',
        new Date(1000),
      ),
    ).toBe('auth_date=1&can_send_after=10000&chat=%7B%22id%22%3A1%2C%22type%22%3A%22group%22%2C%22title%22%3A%22chat-title%22%2C%22photo_url%22%3A%22group%22%2C%22username%22%3A%22my-chat%22%7D&chat_instance=888&chat_type=sender&query_id=QUERY&receiver=%7B%22added_to_attachment_menu%22%3Afalse%2C%22allows_write_to_pm%22%3Atrue%2C%22first_name%22%3A%22receiver-first-name%22%2C%22id%22%3A991%2C%22is_bot%22%3Afalse%2C%22is_premium%22%3Atrue%2C%22language_code%22%3A%22ru%22%2C%22last_name%22%3A%22receiver-last-name%22%2C%22photo_url%22%3A%22receiver-photo%22%2C%22username%22%3A%22receiver-username%22%7D&start_param=debug&user=%7B%22added_to_attachment_menu%22%3Afalse%2C%22allows_write_to_pm%22%3Afalse%2C%22first_name%22%3A%22user-first-name%22%2C%22id%22%3A222%2C%22is_bot%22%3Atrue%2C%22is_premium%22%3Afalse%2C%22language_code%22%3A%22en%22%2C%22last_name%22%3A%22user-last-name%22%2C%22photo_url%22%3A%22user-photo%22%2C%22username%22%3A%22user-username%22%7D&signature=abc&hash=2213454f386e43228e9642d643d72017eb713e9ca5f8e8470bb66b88d643bcc0');
  });
});

describe('signData', () => {
  it('should use HMAC-SHA256 algorithm with key, based on HMAC-SHA256 keyed with the "WebAppData" value, applied to the secret token', () => {
    expect(signData('abc', 'my-secret-token')).toBe(
      '6ecc2e9b51f30dde6877ce374ede54eb626c84e78a5d9a9dcac54d2d248f6bde',
    );
    expect(
      signData(
        'abc',
        'fe37f490481d351837ed49f3b369c886c61013d6d036656fc3c9c92e163e3477',
        { tokenHashed: true },
      ),
    )
      .toBe('6ecc2e9b51f30dde6877ce374ede54eb626c84e78a5d9a9dcac54d2d248f6bde');
  });
});
