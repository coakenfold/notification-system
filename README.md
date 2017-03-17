# Installation

1) [Register a Github OAuth application](https://github.com/settings/applications/new)

The **Authorization callback URL** should be `http://localhost:3000/auth/github/callback`

2) Gmail is used for email delivery but that requires the account to [allow access from less secure apps](https://support.google.com/accounts/answer/6010255)

[https://www.google.com/settings/security/lesssecureapps](https://www.google.com/settings/security/lesssecureapps)

3) Create a config.js file inside the same directory where `server.js` is located

    module.exports = {
      mongoURL: process.env.MONGO_URL || 'mongodb://localhost:27017/notification-system',
      port: process.env.PORT || 8000,
      emailAddress: 'updateYour@gmail.com',
      emailPassword: 'updateYourEmailPassword',
      github: {
        clientSecret: "updateYourGithubApplicationClientSecret",
        clientId: "updateYourGithubApplicationClientId"
      },
      sessionSecret: "Update this text for the session secret",
      user: {
        creator: ['aGithubAccountName','an.email@gmail.com'],
        admin: ['anotherGithubAccountName','a.different.email@gmail.com']]
      }
    };
- See if `mongoUrl` needs to be updated to match your system.
- Update `emailAddress` & `emailPassword` to the Gmail account that will email the notifications.
- Update `github.clientSecret` and `github.clientId`
- Set account privileges in the `user.creator` and `user.admin` arrays. The values can be github account names (without the @) or an email address.

4) Install libraries: `$ npm install`

5) Start mongod: `$ mongod`

6) Start server: `$ npm run server`
