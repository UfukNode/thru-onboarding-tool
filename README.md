<img width="1231" height="392" alt="Ekran Resmi 2026-07-20 21 15 40" src="https://github.com/user-attachments/assets/6841b2cc-ef60-4422-974a-6a251a22ba90" />

# Thru Onboarding Tool

Local and Codespaces-ready web tool for setting up a Thru alphanet account, running basic token/name service actions, and saving proof data.

## Quick Start

In GitHub Codespaces:

```bash
npm start
```

Open the forwarded port shown by Codespaces.

Locally:

```bash
npm start
```

Then open:

```text
http://127.0.0.1:5173
```

If port `5173` is busy, the server automatically tries the next available port.

## Official Links

- `https://rpc.alphanet.thru.org` - Alphanet RPC connection used by the tool
- `https://scan.thru.org` - Explorer for checking accounts and transactions
- `https://faucet.thruscan.net` - Backup faucet page if the in-tool faucet is unavailable

## What It Does

- Checks local tools: Node.js, npm, Thru CLI, jq, OpenSSL, and make
- Installs missing Thru CLI automatically when possible
- Creates a default Thru key
- Creates and funds an on-chain account
- Creates a token mint and token account
- Mints tokens
- Initializes a name service root
- Registers a subdomain
- Adds and resolves a name service record
- Saves useful proof data in the browser
- Exports proof data as JSON or Markdown

## Using The Tool

1. Run `npm start`.
2. Open the web page.
3. Fill the visible fields.
4. Press `Prepare My Account`.
5. Press `Create Token`.
6. Press `Create Name`.
7. Use the `Proof` section to copy or export results.

## Fields

These fields are pre-filled because they are normal defaults:

- `Faucet amount`: amount requested from the faucet
- `Mint amount`: raw token amount to mint
- `Record key`: name service record key

These fields should be chosen by the user:

- `Token symbol`
- `Root name`
- `Subdomain`
- `Record value`

<img width="1165" height="155" alt="Ekran Resmi 2026-07-20 21 16 17" src="https://github.com/user-attachments/assets/d87fd3be-cc14-44ad-9b72-aa89afe775f1" />

## Proof Data

The Proof section keeps:

- public key
- private key
- balance
- mint account
- token account
- domain account
- last signature

Public values can be copied. The private key has a separate `Private Key` download button. Explorer links open the matching address or transaction on:

```text
https://scan.thru.org/
```

## Codespaces Notes

Codespaces is the easiest way to run the tool without local setup. The generated Thru key lives inside the Codespace environment, so export your proof before deleting the Codespace.

## Security Model

The browser cannot run arbitrary shell commands. It calls a local Node.js server, and the server only runs predefined actions from `lib/actions.js`.

The Proof export includes the default private key so the user can save the wallet. Keep it somewhere safe and never share it publicly.

## Scripts

```bash
npm start
npm test
```

## License

MIT
