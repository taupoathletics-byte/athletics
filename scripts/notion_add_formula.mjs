const TOKEN = process.env.NOTION_TOKEN;
const MEMBERS = '3e30d85f-784c-81e6-a79b-ca720cb76a5b';
const res = await fetch(`https://api.notion.com/v1/databases/${MEMBERS}`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    properties: {
      'Attendance summary': {
        formula: { expression: 'format(prop("Nights attended")) + " / 19 nights"' },
      },
    },
  }),
});
const text = await res.text();
console.log(res.status, text.slice(0, 300));
