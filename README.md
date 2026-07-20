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

## Network Defaults

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_THRU_RPC_URL` | Browser RPC endpoint | `https://rpc.alphanet.thru.org` |
| `NEXT_PUBLIC_THRU_EXPLORER_URL` | Explorer base URL | `https://scan.thru.org` |
| `NEXT_PUBLIC_THRU_NETWORK` | Network label | `Alphanet` |
| `NEXT_PUBLIC_THRU_CHAIN_ID` | Transaction chain ID | `1` |
| `NEXT_PUBLIC_FAUCET_AMOUNT` | Requested faucet amount in base units | `10000` |
| `NEXT_PUBLIC_COMMUNITY_FAUCET_URL` | Backup web faucet | `https://faucet.thruscan.net` |
| `NEXT_PUBLIC_TOKEN_PROGRAM_ADDRESS` | Token Program address | Thru's built-in Token Program |
| `NEXT_PUBLIC_NAME_SERVICE_PROGRAM_ADDRESS` | Name Service Program address | Thru's built-in Name Service Program |

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

## Proof Data

The Proof section keeps:

- public key
- balance
- mint account
- token account
- domain account
- last signature

Each value can be copied. Explorer links open the matching address or transaction on:

```text
https://scan.thru.org/
```

## Codespaces Notes

Codespaces is the easiest way to run the tool without local setup. The generated Thru key lives inside the Codespace environment, so export your proof before deleting the Codespace.

## Security Model

The browser cannot run arbitrary shell commands. It calls a local Node.js server, and the server only runs predefined actions from `lib/actions.js`.

Private key output from `thru keys get default` is redacted before it reaches the browser.

## Scripts

```bash
npm start
npm test
```

## License

MIT
