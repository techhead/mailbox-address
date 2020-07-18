# mailbox-address
Validate syntax for a RFC 5321/6531(SMTPUTF8) email mailbox address.

## Installing

For the latest stable version:

```bash
npm install mailbox-address
```

## Usage in Typescript

```ts
import { validate, MailboxType } from "mailbox-address";

const address = "Διεθνές@Greek.com";
const valid = mailboxAddress.validate(address, MailboxType.SMTPUTF8);
if (valid) {
  console.log(`${valid} is a valid internationalized (SMTPUTF8) email mailbox address.`);
} else {
  console.log(`${address} is NOT a valid internationalized (SMTPUTF8) email mailbox address.`);
}
```

## Usage in the browser via [UNPKG](https://unpkg.com/)

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<script src="https://unpkg.com/mailbox-address"></script>
</head>
<body>
<p>Try playing with <code>mailboxAddress</code> in the console.</p>
<p><b id="address"></b> is a <b id="valid"></b> internationalized (SMTPUTF8) email mailbox address.</p>
<script>
const SMTPUTF8 = 1;
const address = "Διεθνές@Greek.com";
const valid = mailboxAddress.validate(address, SMTPUTF8);
document.getElementById('address').innerText = valid || address;
document.getElementById('valid').innerText = valid ? 'valid' : 'invalid';
</script>
</body>
</html>
```

## API docs

`validate(mailbox: string, type?: MailboxType): string | false`
* [validate](http://techhead.biz/mailbox-address/index.html#validate)
* [MailboxType](http://techhead.biz/mailbox-address/enums/mailboxtype.html)

## License
MIT
