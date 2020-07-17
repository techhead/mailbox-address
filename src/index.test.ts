import { validate, MailboxType } from "./index";

describe("Test Wikipedia Email Address Examples (https://en.wikipedia.org/wiki/Email_address#Examples)", () => {
  describe("Valid email addresses", () => {
    [
      "simple@example.com",
      "very.common@example.com",
      "disposable.style.email.with+symbol@example.com",
      "other.email-with-hyphen@example.com",
      "fully-qualified-domain@example.com",
      "user.name+tag+sorting@example.com",
      "x@example.com",
      "example-indeed@strange-example.com",
      "example@s.example",
      "mailhost!username@example.org",
      "user%example.com@example.org",
    ].forEach((mailbox) => {
      test(`${mailbox} is valid`, () => {
        expect(validate(mailbox)).toBeTruthy();
      });
    });
    ["admin@mailserver1", '" "@example.org', '"john..doe"@example.org'].forEach(
      (mailbox) => {
        test(`${mailbox} is valid`, () => {
          expect(validate(mailbox, MailboxType.STRICT)).toBeTruthy();
        });
      }
    );
  });
  describe("Invalid email addresses", () => {
    [
      "Abc.example.com",
      "A@b@c@example.com",
      'a"b(c)d,e:f;g<h>i[j\\k]l@example.com',
      'just"not"right@example.com',
      'this is"not\\allowed@example.com',
      'this\\ still\\"not\\\\allowed@example.com',
      "1234567890123456789012345678901234567890123456789012345678901234+x@example.com",
      "i_like_underscore@but_its_not_allow_in_this_part.example.com",
    ].forEach((mailbox) => {
      test(`${mailbox} is invalid`, () => {
        expect(validate(mailbox, MailboxType.STRICT)).toBe(false);
      });
    });
  });
  describe("Internationalization examples", () => {
    [
      "Pelé@example.com",
      "δοκιμή@παράδειγμα.δοκιμή",
      "我買@屋企.香港",
      "二ノ宮@黒川.日本",
      "медведь@с-балалайкой.рф",
      "संपर्क@डाटामेल.भारत",
    ].forEach((mailbox) => {
      test(`${mailbox} is valid`, () => {
        expect(validate(mailbox, MailboxType.RFC6531)).toBeTruthy();
      });
    });
  });
});

describe("Test local part", () => {
  const valid = [
    '"<my.name>"@example.com',
    '"[my.name]"@example.com',
    '"(my.name)"@example.com',
    "{my.name}@example.com",
  ];
  const invalid = [
    "my..name@example.com",
    ".my.name@example.com",
    "my.name.@example.com",
    "<my.name>@example.com",
    "[my.name]@example.com",
    "(my.name)@example.com",
  ];
  valid.forEach((mailbox) => {
    test(`${mailbox} is valid`, () => {
      expect(validate(mailbox, MailboxType.ALLOW_QUOTED_STRING)).toBeTruthy();
    });
  });
  invalid.forEach((mailbox) => {
    test(`${mailbox} is invalid`, () => {
      expect(validate(mailbox, MailboxType.STRICT)).toBe(false);
    });
  });
  // Invalid unicode
  [
    "my\ud800name@example.com", // lone surrogate
    "my\udbff\udbffname@example.com", // high surrogate followed by high again
    "my\udc00\udbffname@example.com", // low surrogate followed by high
    "my\udc00\udc00name@example.com", // low surrogate followed by low again
  ].forEach((mailbox) => {
    test(`${mailbox} is invalid`, () => {
      expect(validate(mailbox, MailboxType.SMTPUTF8)).toBe(false);
    });
  });
});

describe("Test address literals", () => {
  describe("Test IPv4 address literals", () => {
    const valid = [
      "me@[192.168.0.1]",
      "me@[192.168.000.001]",
      "me@[192.168.0.255]",
      "me@[0.0.0.0]",
      "me@[000.000.000.000]",
    ];
    const invalid = ["me@[192.168.0.256]", "me@[500.0.0.1]", "me@[260.0.0.1]"];
    valid.forEach((mailbox) => {
      test(`${mailbox} is valid`, () => {
        expect(
          validate(mailbox, MailboxType.ALLOW_ADDRESS_LITERAL)
        ).toBeTruthy();
      });
    });
    invalid.forEach((mailbox) => {
      test(`${mailbox} is invalid`, () => {
        expect(validate(mailbox, MailboxType.STRICT)).toBe(false);
      });
    });
  });
  describe("Test IPv6 address literals", () => {
    const valid = [
      "me@[IPv6:2001:0db8:85a3:0000:0000:8a2e:0370:7334]",
      "me@[IPv6:::]",
      "me@[IPv6:::1]",
      "me@[IPv6:2001:db8::1:0:0:1]",
      "me@[IPv6:::ffff:c000:0280]",
      "me@[IPv6:::ffff:192.0.2.128]",
      "me@[IPv6:1:2:3:4::192.0.2.128]",
      "me@[IPv6:1:2:3::4:192.0.2.128]",
    ];
    const invalid = [
      "me@[IPv7:::]",
      "me@[IPv6:2001:0db8:85a3:0000:0000:8a2e:0370]",
      "me@[IPv6:2001:0db8:85a3:0000:0000:8a2e:0370:7334:0000]",
      "me@[IPv6:2001:db8::1:0:0:1:0:0]",
      "me@[IPv6:0:2001:db8::1:0:0:1:0]",
      "me@[IPv6:2001:db8::1:0::1]",
      "me@[IPv6:1:2:3:4:5:6::192.0.2.128]",
      "me@[IPv6:1:2:3:4::5:6:192.0.2.128]",
    ];
    valid.forEach((mailbox) => {
      test(`${mailbox} is valid`, () => {
        expect(
          validate(mailbox, MailboxType.ALLOW_ADDRESS_LITERAL)
        ).toBeTruthy();
      });
    });
    invalid.forEach((mailbox) => {
      test(`${mailbox} is invalid`, () => {
        expect(validate(mailbox, MailboxType.STRICT)).toBe(false);
      });
    });
  });
});

describe("Test address normalization", () => {
  Object.entries({
    '"{my.name}"@example.com': "{my.name}@example.com",
    '"my name"@EXAMPLE.com': '"my name"@example.com',
    '"my\\!name\\=cool"@eXaMple.com': "my!name=cool@example.com",
  }).forEach(([mailbox, normal]) => {
    test(`${mailbox} => ${normal}`, () => {
      expect(validate(mailbox, MailboxType.ALLOW_QUOTED_STRING)).toBe(normal);
    });
  });
});
