import type * as urlModule from "url";

/**
 * For the purposes of this module, an "email address" refers to the Mailbox
 * definition in RFS 5321 section 4.1.2, and NOT to the addr-spec definition
 * found in RFS 5322 section 3.4.1, of which Mailbox appears to be a subset.
 *
 * Ignored by this module is the definition of a "valid email address" given in
 * the HTML Living Standard, which address is (mostly) a subset of Mailbox.
 * https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
 *
 * Mailbox is further extended by RFC 6531 (SMTP Extension for
 * Internationalized Email) section 3.3 Extended Mailbox Address Syntax to add
 * support of non-ASCII characters.
 */

/**
 * Type of Mailbox. Flags for buildPattern() and validate() functions.
 */
export const enum MailboxType {
  /**
   * RFC 5321 Mailbox address.
   * Does NOT allow quoted string local parts, address literals,
   * or local domains by default. See STRICT flag.
   */
  RFC5321,
  /**
   * RFC 6531 Extended Mailbox Address (SMTPUTF8 address).
   * Supports Unicode characters.
   * Does NOT allow quoted string local parts, address literals,
   * or local domains by default. See STRICT flag.
   */
  RFC6531,
  /**
   * Alias to RFC6531.
   */
  SMTPUTF8 = RFC6531,
  /**
   * Add flag to RFC5321 or RFC6531 to allow quoted strings in local part.
   */
  ALLOW_QUOTED_STRING = 1 << 1,
  /**
   * Add flag to RFC5321 or RFC6531 to allow address literals.
   */
  ALLOW_ADDRESS_LITERAL = 1 << 2,
  /**
   * Add flag to RFC5321 or RFC6531 to allow local domains.
   */
  ALLOW_LOCAL_DOMAIN = 1 << 3,
  /**
   * Add flag to RFC5321 or RFC6531 for strict interpretation.
   * (ALLOW_QUOTED_STRING | ALLOW_ADDRESS_LITERAL | ALLOW_LOCAL_DOMAIN)
   */
  STRICT = ALLOW_QUOTED_STRING | ALLOW_ADDRESS_LITERAL | ALLOW_LOCAL_DOMAIN,
}

/**
 * typeof function
 */
const FN = "function";

/**
 * NodeJS version or falsy if not NodeJS.
 */
const nodeVer = typeof process !== "undefined" && process.versions?.node;

/**
 * Webpack require hack.
 * https://webpack.js.org/api/module-variables/#__webpack_require__-webpack-specific
 */
declare var __webpack_require__: any;

/**
 * Webpack require hack.
 * https://webpack.js.org/api/module-variables/#__non_webpack_require__-webpack-specific
 */
declare var __non_webpack_require__: typeof require;

/**
 * Alias to NodeJS require() or undefined.
 */
const nodeRequire = nodeVer
  ? typeof __webpack_require__ === "function"
    ? __non_webpack_require__
    : require
  : undefined;

/**
 * Reference to the NodeJS "url" module (if NodeJS environment).
 */
const url = nodeRequire && (nodeRequire("url") as typeof urlModule);

/**
 * WHATWG URL Class
 * NodeJS, class available on global object in v10.0.0
 */
const URLClass = (typeof URL === FN && URL) || url?.URL;

/**
 * Not IE.
 * https://developer.mozilla.org/en-US/docs/Web/API/URL#Browser_compatibility
 */
const supportsURLConstructor = URLClass && normalizeHost("o.co") === "o.co";

/**
 * Not IE and not Android webview according to MDN on 7/7/2020.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize#Browser_compatibility
 */
const supportsUnicodeNormalization = typeof "".normalize === FN;

/**
 * True if this environment supports the unicode ('u') flag for RegExp.
 *
 * See [Browser compatibility](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/unicode#Browser_compatibility).
 * (Hint: Not IE.)
 *
 * https://mathiasbynens.be/notes/es6-unicode-regex
 */
export const supportsUnicodeRegExp = (() => {
  try {
    return new RegExp("^\\u{1f62c}$", "u").test("\ud83d\ude2c");
  } catch (e) {
    return false;
  }
})();

/**
 * Function represents the ToASCII operation of IDNA
 * (Internationalizing Domain Names in Applications)
 * but will work on entire domain string, not only
 * individual U-labels.
 * https://url.spec.whatwg.org/#concept-domain-to-ascii
 */
const domainToASCII =
  (url && url.domainToASCII) /* NodeJS, Added in: v7.4.0, v6.13.0 */ ||
  (supportsURLConstructor && normalizeHost("\u00f6bb.at") === "xn--bb-eka.at"
    ? normalizeHost
    : undefined);

/**
 * Return the number of bytes required for the UTF-8 representation
 * of the string.
 */
const byteLength: (s: string) => number =
  typeof Buffer === FN && typeof Buffer.byteLength === FN
    ? Buffer.byteLength // NodeJS, Added in: v0.1.90
    : (s) => {
        let bytes = 0;
        const codes = s.length;
        for (let i = 0; i < codes; i++) {
          const hi = s.charCodeAt(i);
          if (hi < 0x0080) {
            bytes += 1;
          } else if (hi < 0x0800) {
            bytes += 2;
          } else if (hi < 0xd800 || hi > 0xdfff) {
            bytes += 3;
          } else {
            if (hi < 0xdc00 && ++i < codes) {
              const lo = s.charCodeAt(i);
              if (lo >= 0xdc00 && lo <= 0xdfff) {
                bytes += 4;
                continue;
              }
            }
            throw new Error("Invalid UTF-16");
          }
        }
        return bytes;
      };

/*
RFC 6531: SMTP Extension for Internationalized Email
3.3.  Extended Mailbox Address Syntax
https://tools.ietf.org/html/rfc6531#section-3.3

The following ABNF rule will be imported from RFC 6532, Section 3.1,
directly:

o  <UTF8-non-ascii>

NOTE:
Strings in Javascript are stored in UTF-16 internally (sort of,
https://mathiasbynens.be/notes/javascript-encoding), not as a simple string of
octets, which is how UTF-8 is encoded. Therefore, strictly validating
UTF8-non-ascii in this context is impossible. (When a mailbox string is
externally stored or transmitted, it should first be encoded in UTF-8.) But for
validation purposes, we'll interpret the <UTF8-non-ascii> definition to mean
"all non-ascii Unicode characters" or in some cases, "all non-ascii characters"
that can be contained in a Javascript string (prior to further validation --
see the byteLength() function).
*/
const allNonAscii = "[\\u0080-\\uffff]";
// This pattern is only supported by the "u" flag of RegExp.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/unicode
const unicodeNonAscii = "[\\u0080-\\ud7ff\\u{e000}-\\u{10ffff}]";

/*
RFC 5322: Internet Message Format
3.2.3.  Atom
https://tools.ietf.org/html/rfc5322#section-3.2.3

atext          =   ALPHA / DIGIT /    ; Printable US-ASCII
                    "!" / "#" /       ;  characters not including
                    "$" / "%" /       ;  specials.  Used for atoms.
                    "&" / "'" /
                    "*" / "+" /
                    "-" / "/" /
                    "=" / "?" /
                    "^" / "_" /
                    "`" / "{" /
                    "|" / "}" /
                    "~"

specials       =   "(" / ")" /        ; Special characters that do
                    "<" / ">" /       ;  not appear in atext
                    "[" / "]" /
                    ":" / ";" /
                    "@" / "\" /
                    "," / "." /
                    DQUOTE

RFC 6531: SMTP Extension for Internationalized Email
3.3.  Extended Mailbox Address Syntax
https://tools.ietf.org/html/rfc6531#section-3.3

o  The definition of <atext> is extended to permit both the RFC 5321
    definition and a UTF-8 string.  That string MUST NOT contain any
    of the ASCII graphics or control characters.

atext   =/  UTF8-non-ascii
    ; extend the implicit definition of atext in
    ; RFC 5321, Section 4.1.2, which ultimately points to
    ; the actual definition in RFC 5322, Section 3.2.3

See NOTE on UTF8-non-ascii above.
*/
const atextRE = "[!#$%&'*+\\-/0-9=?A-Z\\^_`a-z{|}~]";
//const atextExtRE = atextRE.slice(0, -1) + unicodeNonAscii.slice(1);

/*
RFC 5321: Simple Mail Transfer Protocol
4.1.2.  Command Argument Syntax
https://tools.ietf.org/html/rfc5321#section-4.1.2

quoted-pairSMTP  = %d92 %d32-126
                ; i.e., backslash followed by any ASCII
                ; graphic (including itself) or SPace

qtextSMTP      = %d32-33 / %d35-91 / %d93-126
                ; i.e., within a quoted string, any
                ; ASCII graphic or space is permitted
                ; without blackslash-quoting except
                ; double-quote and the backslash itself.

RFC 6531: SMTP Extension for Internationalized Email
3.3.  Extended Mailbox Address Syntax
https://tools.ietf.org/html/rfc6531#section-3.3

qtextSMTP  =/ UTF8-non-ascii
    ; extend the definition of qtextSMTP in RFC 5321, Section 4.1.2

See NOTE on UTF8-non-ascii above.
*/
const quotedPairRE = "\\\\[\\x20-\\x7e]";
const qtextRE = "[ !\\x23-\\x5b\\x5d-\\x7e]";
//const qtextExtRE = qtextRE.slice(0, -1) + unicodeNonAscii.slice(1);

/*
RFC 5321: Simple Mail Transfer Protocol
4.1.3.  Address Literals
https://tools.ietf.org/html/rfc5321#section-4.1.3

IPv4-address-literal  = Snum 3("."  Snum)

Snum           = 1*3DIGIT
                ; representing a decimal integer
                ; value in the range 0 through 255
*/
//const sNumRE = "(?:[01]?[0-9]{1,2}|2(?:[0-4][0-9]|5[0-5]))";
const sNumRE = "[0-9]{1,3}"; // Less strict. Less correct. Less.
const IPv4AddressLiteralRE = sNumRE + "(?:\\." + sNumRE + "){3}";

/*
RFC 5321: Simple Mail Transfer Protocol
4.1.3.  Address Literals
https://tools.ietf.org/html/rfc5321#section-4.1.3

IPv6-address-literal  = "IPv6:" IPv6-addr

IPv6-addr      = IPv6-full / IPv6-comp / IPv6v4-full / IPv6v4-comp

IPv6-hex       = 1*4HEXDIG

IPv6-full      = IPv6-hex 7(":" IPv6-hex)

IPv6-comp      = [IPv6-hex *5(":" IPv6-hex)] "::"
                [IPv6-hex *5(":" IPv6-hex)]
                ; The "::" represents at least 2 16-bit groups of
                ; zeros.  No more than 6 groups in addition to the
                ; "::" may be present.

IPv6v4-full    = IPv6-hex 5(":" IPv6-hex) ":" IPv4-address-literal

IPv6v4-comp    = [IPv6-hex *3(":" IPv6-hex)] "::"
                [IPv6-hex *3(":" IPv6-hex) ":"]
                IPv4-address-literal
                ; The "::" represents at least 2 16-bit groups of
                ; zeros.  No more than 4 groups in addition to the
                ; "::" and IPv4-address-literal may be present.
*/
/*
const IPv6HexRE = "[0-9a-fA-F]{1,4}";
const IPv6HexGrpRE = IPv6HexRE + "(?:\\:" + IPv6HexRE + ")";
const IPv6HexOptGrp6RE = "(?:" + IPv6HexGrpRE + "{0,5})?";
const IPv6FullRE = IPv6HexGrpRE + "{7}";
const IPv6CompRE = IPv6HexOptGrp6RE + "\\:\\:" + IPv6HexOptGrp6RE;
const IPv6v4FullRE = IPv6HexGrpRE + "{5}\\:" + IPv4AddressLiteralRE;
const IPv6v4CompRE =
  "(?:" +
  IPv6HexGrpRE +
  "{0,3})?" +
  "\\:\\:" +
  "(?:" +
  IPv6HexGrpRE +
  "{0,3}\\:)?" +
  IPv4AddressLiteralRE;
const IPv6AddrRE =
  "(?:" +
  IPv6FullRE +
  "|" +
  IPv6CompRE +
  "|" +
  IPv6v4FullRE +
  "|" +
  IPv6v4CompRE +
  ")";
const IPv6AddressLiteralRE = "IPv6\\:" + IPv6AddrRE;
*/

/*
RFC 5321: Simple Mail Transfer Protocol
4.1.2.  Command Argument Syntax
https://tools.ietf.org/html/rfc5321#section-4.1.2

address-literal  = "[" ( IPv4-address-literal /
                IPv6-address-literal /
                General-address-literal ) "]"

4.1.3.  Address Literals

General-address-literal  = Standardized-tag ":" 1*dcontent

Standardized-tag  = Ldh-str
                    ; Standardized-tag MUST be specified in a
                    ; Standards-Track RFC and registered with IANA

dcontent       = %d33-90 / ; Printable US-ASCII
                %d94-126 ; excl. "[", "\", "]"
*/
const generalAddressLiteralRE =
  "[a-zA-Z0-9\\-]*[a-zA-Z0-9]:[\\x21-\\x5a\\x5e-\\x7e]+";
const addressLiteralRE =
  "\\[(?:" +
  IPv4AddressLiteralRE +
  /*
  "|" +
  IPv6AddressLiteralRE +
  */
  "|" +
  generalAddressLiteralRE +
  ")\\]";

/**
 * Build a regular expression (RegExp) pattern string for validating/matching
 * an email mailbox address of the given type. Will attempt to use a unicode-
 * aware pattern for SMTPUTF8 addresses if the environment supports it.
 * See [[supportsUnicodeRegExp]].
 * @param type
 * @returns The regular expression pattern string.
 */
export function buildPattern(type = MailboxType.RFC5321) {
  /*
  EXCEPTION:
  RFC 5321 allows for the local-part of a mailbox to contain a quoted-string.
  This is rarely used in practice, so it isn't the default behavior here.
  Use the ALLOW_QUOTED_STRING or STRICT flag to enable.

  Local-part     = Dot-string / Quoted-string
                  ; MAY be case-sensitive
  */
  const dotString = dotStringRE(type);
  const localPartRE =
    type & MailboxType.ALLOW_QUOTED_STRING
      ? "(" + dotString + "|" + quotedStringRE(type) + ")"
      : "(" + dotString + ")";

  /*
  RFC 5321: Simple Mail Transfer Protocol
  4.1.2.  Command Argument Syntax
  https://tools.ietf.org/html/rfc5321#section-4.1.2

  sub-domain     = Let-dig [Ldh-str]
  Let-dig        = ALPHA / DIGIT
  Ldh-str        = *( ALPHA / DIGIT / "-" ) Let-dig

  RFC 6531: SMTP Extension for Internationalized Email
  3.3.  Extended Mailbox Address Syntax
  https://tools.ietf.org/html/rfc6531#section-3.3

  o  The definition of <sub-domain> is extended to permit both the RFC
      5321 definition and a UTF-8 string in a DNS label that conforms
      with IDNA definitions [RFC5890].

  The following ABNF rule will be imported from RFC 5890, Section 
  2.3.2.1, directly:

  o  <U-label>

  sub-domain   =/  U-label
      ; extend the definition of sub-domain in RFC 5321, Section 4.1.2

  NOTE:
  U-labels captured by the regular expression are unvalidated U-labels according
  to RFC 5890. Unvalidated U-labels are simply non-ASCII labels that may or may
  not meet the requirements for U-labels. See the validate() function.
  */
  const letDig = charClass("[a-zA-Z0-9]", type);
  const ldhRun = type & MailboxType.SMTPUTF8 ? "*" : "{0,61}";
  const ldhStr = letDig.slice(0, -1) + "\\-]" + ldhRun + letDig;
  const subDomainRE = letDig + "(?:" + ldhStr + ")?";

  /*
  EXCEPTION:
  RFC 5321 doesn't require more than a single domain part (sub-domain).
  This allows local host names to be valid (such as @localhost).
  But these are not very useful in practice, so it isn't the default
  behavior here. Use the ALLOW_LOCAL_DOMAIN or STRICT flag to enable.

  Domain         = sub-domain *("." sub-domain)                        
  */
  const sdRun = type & MailboxType.ALLOW_LOCAL_DOMAIN ? "*" : "+";
  const domainRE = subDomainRE + "(?:\\." + subDomainRE + ")" + sdRun;

  /*
  EXCEPTION:
  RFC 5321 allows for an address-literal after the '@' sign for specifying
  an IP address instead of a domain name. This usage isn't typical except in
  abuse situations. So it's off by default. Use the ALLOW_ADDRESS_LITERAL or
  STRICT flag to enable.

  Mailbox        = Local-part "@" ( Domain / address-literal )
  */
  return type & MailboxType.ALLOW_ADDRESS_LITERAL
    ? localPartRE + "@(" + domainRE + "|" + addressLiteralRE + ")"
    : localPartRE + "@(" + domainRE + ")";
}

/*
RFC 5321: Simple Mail Transfer Protocol
4.1.2.  Command Argument Syntax
https://tools.ietf.org/html/rfc5321#section-4.1.2

Dot-string     = Atom *("."  Atom)
Atom           = 1*atext
*/
function dotStringRE(type: number) {
  const atomRE = charClass(atextRE, type) + "+";
  return atomRE + "(?:\\." + atomRE + ")*";
}

/**
RFC 5321: Simple Mail Transfer Protocol
4.1.2.  Command Argument Syntax
https://tools.ietf.org/html/rfc5321#section-4.1.2

Quoted-string  = DQUOTE *QcontentSMTP DQUOTE
QcontentSMTP   = qtextSMTP / quoted-pairSMTP
 */
function quotedStringRE(type: number) {
  return '"(?:' + charClass(qtextRE, type) + "|" + quotedPairRE + ')*"';
}

/**
 * Conditionally extend character class for RFC 6531.
 * Or return pattern as is.
 * @param def Character class
 * @param type MailboxType flag
 */
function charClass(def: string, type: number) {
  return type & MailboxType.SMTPUTF8
    ? supportsUnicodeRegExp
      ? def.slice(0, -1) + unicodeNonAscii.slice(1)
      : def.slice(0, -1) + allNonAscii.slice(1)
    : def;
}

const regExpCache: RegExp[] = [];

function asRegExp(type: number, fn: (type: number) => string = buildPattern) {
  const pattern = "^" + fn(type) + "$";
  const flags =
    type & MailboxType.SMTPUTF8 && supportsUnicodeRegExp ? "u" : undefined;
  return new RegExp(pattern, flags);
}

/**
 * Validate syntax for a RFC 5321/6531(SMTPUTF8) mailbox address.
 * @param mailbox The mailbox address.
 * @param type
 * @returns The normalized, validated mailbox address string
 *          or false on failure.
 */
export function validate(mailbox: string, type = MailboxType.RFC5321) {
  if (!regExpCache[type]) {
    regExpCache[type] = asRegExp(type);
  }

  // Validate mailbox against pattern.
  const match = regExpCache[type].exec(mailbox);
  if (!match) {
    return false;
  }

  let [, localPart, domain] = match;

  if (type & MailboxType.ALLOW_QUOTED_STRING && localPart[0] === '"') {
    localPart = normalizeQuotedString(localPart, type);
  }

  let localPartLength;
  if (type & MailboxType.SMTPUTF8) {
    /*
    RFC 6532:  Internationalized Email Headers
    3.1.  UTF-8 Syntax and Normalization
    https://tools.ietf.org/html/rfc6532#section-3.1

    See [RFC5198] for a discussion of Unicode normalization;
    normalization form NFC [UNF] SHOULD be used.
    */
    if (supportsUnicodeNormalization) {
      // Invalid UTF-16 stays invalid in this NodeJS test:
      // Buffer.from("\ud800".normalize(), "ucs2");
      // Unsure if this property can be relied upon in all implementations.
      localPart = localPart.normalize();
    }
    try {
      // Count byte length of UTF-8 representation
      // (and possibly validate localPart as a valid UTF-16 string).
      localPartLength = byteLength(localPart);
    } catch (e) {
      // Invalid UTF-16
      return false;
    }
  } else {
    localPartLength = localPart.length;
  }
  /*
  RFC 5321: Simple Mail Transfer Protocol
  4.5.3.1.  Size Limits and Minimums
  https://tools.ietf.org/html/rfc5321#section-4.5.3.1

  4.5.3.1.1.  Local-part

  The maximum total length of a user name or other local-part is 64
  octets.
  */
  if (localPartLength > 64) {
    return false;
  }

  if (type & MailboxType.ALLOW_ADDRESS_LITERAL && domain[0] === "[") {
    if (supportsURLConstructor && !(domain = normalizeAddressLiteral(domain))) {
      return false;
    }
  } else if (type & MailboxType.SMTPUTF8) {
    // Unicode normalization should be available in most modern browsers
    // as well as in NodeJS. It is NOT in IE. The strategy here is to do what
    // can be done and to keep going without failure, knowing that if
    // validation steps are skipped on the client side, they will still be
    // performed on the server side (eg. NodeJS).
    if (supportsUnicodeNormalization) {
      domain = domain.normalize();
    }
    // This function should be available on every modern browser but NOT IE.
    // Keep going without failure (see comment above).
    if (domainToASCII) {
      // Convert U-labels into lowercase A-labels for validation.
      // The IDNA ToASCII function is intended to work on individual U-labels
      // and not the domain as a whole. But the domainToASCII implementation
      // here should work in this case.
      const aDomain = domainToASCII(domain);
      if (!aDomain || aDomain.length > 255) {
        return false;
      }
      for (let ldhLabel of aDomain.split(".")) {
        if (ldhLabel.length > 63) {
          return false;
        }
      }
      if (url && url.domainToUnicode) {
        // Convert all A-labels back to U-labels (NodeJS only).
        domain = url.domainToUnicode(aDomain);
      }
    }
  } else {
    /*
    RFC 5321: Simple Mail Transfer Protocol
    4.5.3.1.  Size Limits and Minimums
    https://tools.ietf.org/html/rfc5321#section-4.5.3.1

    4.5.3.1.2.  Domain

    The maximum total length of a domain name or number is 255 octets.
    */
    if (domain.length > 255) {
      return false;
    }
    domain = domain.toLowerCase();
  }

  return localPart + "@" + domain;
}

/**
 * Returns the simplest equivalent representation of the quoted string.
 * @param quotedString
 * @param type
 */
function normalizeQuotedString(quotedString: string, type: number) {
  /*
  RFC 5321: Simple Mail Transfer Protocol
  4.1.2.  Command Argument Syntax
  https://tools.ietf.org/html/rfc5321#section-4.1.2

   For any purposes that require generating or comparing
   Local-parts (e.g., to specific mailbox names), all quoted forms MUST
   be treated as equivalent, and the sending system SHOULD transmit the
   form that uses the minimum quoting possible.
   ...
   Note that the backslash, "\", is a quote character, which is used to
   indicate that the next character is to be used literally (instead of
   its normal interpretation).
  */
  quotedString = quotedString.replace(new RegExp(quotedPairRE, "g"), (match) =>
    match[1] === '"' || match[1] === "\\" ? match : match[1]
  );
  /*
  RFC 5322: Internet Message Format
  3.4.1.  Addr-Spec Specification
  https://tools.ietf.org/html/rfc5322#section-3.4.1

   An addr-spec is a specific Internet identifier that contains a
   locally interpreted string followed by the at-sign character ("@",
   ASCII value 64) followed by an Internet domain.  The locally
   interpreted string is either a quoted-string or a dot-atom.  If the
   string can be represented as a dot-atom (that is, it contains no
   characters other than atext characters or "." surrounded by atext
   characters), then the dot-atom form SHOULD be used and the quoted-
   string form SHOULD NOT be used.
  */
  const maybeDotAtom = quotedString.slice(1, -1);
  return asRegExp(type, dotStringRE).test(maybeDotAtom)
    ? maybeDotAtom
    : quotedString;
}

/**
 * Return address literal in normal form
 * or return an empty string if the literal is invalid.
 * @param lit
 */
function normalizeAddressLiteral(lit: string) {
  const m = /^\[([^:]+):([^\]]+)\]$/.exec(lit);
  if (m) {
    const [, tag, content] = m;
    if (tag === "IPv6") {
      const ipv6 = normalizeHost("[" + content + "]");
      if (ipv6) {
        return "[" + tag + ":" + ipv6.slice(1);
      }
    }
  } else {
    const ipv4 = normalizeHost(lit.slice(1, -1));
    if (ipv4) {
      return "[" + ipv4 + "]";
    }
  }
  return "";
}

/**
 * Return host, serialized.
 * Take advantage of the considerable work already done by the URL class.
 * https://url.spec.whatwg.org/#concept-domain-to-ascii
 * https://url.spec.whatwg.org/#host-parsing
 * https://url.spec.whatwg.org/#host-serializing
 * https://url.spec.whatwg.org/#url-parsing
 * https://url.spec.whatwg.org/#api
 * @param u
 */
function normalizeHost(u: string) {
  try {
    // return url’s host, serialized.
    // https://url.spec.whatwg.org/#dom-url-host
    return URLClass ? new URLClass("http://" + u).host : u;
  } catch (e) {}
  return "";
}
