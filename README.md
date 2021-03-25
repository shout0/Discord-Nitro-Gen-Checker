# Discord Nitro Generator & Checker
![Release](https://img.shields.io/github/v/release/Catatomik/Discord-Nitro-Gen-Checker)

## Presentation 📖
**Discord Nitro Generator & Checker** is a simple, efficace and fully configurable Discord Nitro generator.  
It supports advanced generation (like appending prefix or suffix, generating every possible code...) and manual or automatic proxies in order to leverage the checking power.

It will basically generate random codes and test them through Discord's API, and let you know where there's a hit.

## Installation 💾
Very easy :
1. Prepare the environment
    - Make sure `node >=14` is installed, or [install it](https://www.google.com/search?q=install+node+14)
    - Create a new folder for this program : `mkdir Dngc`
    - Go into it : `cd Dngc/`
2. Run `git clone https://github.com/Catatomik/Discord-Nitro-Gen-Checker.git` to copy the program
3. Install the program (dependencies) : `npm i`
4. Configure before lauching
    - Open the config file : `nano config.json`
    - Edit as wanted, properties are explicit, then save and close.
5. Run `node generator.js` to generate codes, or append somes to a file named `codes/codes.txt`.
6. Run `node checked.js` to start massively checking codes.

## Support
In case of bug, just open an [issue](https://github.com/Catatomik/Discord-Nitro-Gen-Checker/issues/new/choose).