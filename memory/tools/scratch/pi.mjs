// Scratch — BUG-2026-10-12-002 reproduction of react-phone-number-input digit handling (planning evidence, not app code)
import metadata from '/app/frontend/node_modules/libphonenumber-js/metadata.min.json' with { type: 'json' };
import { onPhoneDigitsChange } from '/app/frontend/node_modules/react-phone-number-input/modules/helpers/phoneInputHelpers.js';

const run = (seq, label) => {
  console.log(`\n== ${label}`);
  let prevPhoneDigits = '', country = 'IN', input = '';
  for (const ch of seq) {
    input += ch;
    const r = onPhoneDigitsChange(input, {
      prevPhoneDigits, country, defaultCountry: 'IN', latestCountrySelectedByUser: undefined,
      countryRequired: false, getAnyCountry: () => 'IN', countries: undefined,
      international: undefined, limitMaxLength: false, countryCallingCodeEditable: undefined, metadata,
    });
    prevPhoneDigits = r.phoneDigits; country = r.country; input = r.phoneDigits;
    console.log(JSON.stringify(ch), '→ input now:', String(r.phoneDigits).padEnd(14), 'country:', r.country, 'value:', r.value);
  }
};
run('9135133228', 'type 9135133228 digit by digit (national mode, defaultCountry IN)');
run('9876543210', 'control: 9876543210');
run('+919135133228', 'type +919135133228');
