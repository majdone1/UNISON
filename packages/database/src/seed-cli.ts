import { resetDemoStore } from './demo-store';

const store = resetDemoStore();
console.log(
  JSON.stringify(
    {
      users: store.users.length,
      orgs: store.organizations.length,
      boards: store.boards.length,
      items: store.items.length,
      note: 'Local demo seed only — never for production',
    },
    null,
    2,
  ),
);
