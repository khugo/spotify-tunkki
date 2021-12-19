import { Page } from "puppeteer-core";

const puppeteer = require("puppeteer-core");
const path = require("path");

const LOGIN_URL = "https://accounts.spotify.com/en/login?continue=https:%2F%2Fopen.spotify.com%2F"
const MAC_CHROME_PATH = "/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome"

const main = async () => {
    console.log("Launching browser")
    const browser = await puppeteer.launch({ headless: true, executablePath: path.join(__dirname, "../run_chromium"), args: puppeteer.defaultArgs().filter(arg => arg !== "--mute-audio") });
    console.log("Launching page")
    const page = await browser.newPage();
    await login(page);
    await selectThisDeviceForPlayback(page);
    await playPlaylist(page, "Jazz");
}

const login = async (page: Page) => {
    console.log("Navigating to", LOGIN_URL)
    await page.goto(LOGIN_URL);
    console.log("Filling in credentials")
    await page.type("#login-username", process.env.SPOTIFY_USERNAME);
    await page.type("#login-password", process.env.SPOTIFY_PASSWORD);
    console.log("Submitting form")
    await page.click("#login-button");
}

// Select this device for playback
const selectThisDeviceForPlayback = async (page: Page) => {
    const deviceSelector = 'svg[aria-label="Connect to a device"]'
    await page.waitForSelector(deviceSelector)
    await page.evaluate((deviceSelector) => document.querySelector(deviceSelector).parentElement.click(), deviceSelector)
    const thisDeviceBtnSelector = ".connect-device-list-item";
    await page.waitForSelector(thisDeviceBtnSelector);
    await new Promise(resolve => setTimeout(resolve, 1000))
    await page.evaluate(async (thisDeviceBtnSelector) => {
        const go = async (attempts = 0) => {
            if (attempts > 100) {
                throw new Error("Failed to find button for playing on this device.");
            }
            const thisDeviceBtn = Array.from(document.querySelectorAll(thisDeviceBtnSelector)).find(button => button.textContent.toLowerCase().includes("this web browser"));
            if (!thisDeviceBtn) {
                await new Promise(resolve => setTimeout(resolve, 10));
                go(attempts++);
                return;
            }
            thisDeviceBtn.click();
        }
        await go();
    }, thisDeviceBtnSelector)
}

const playPlaylist = async (page: Page, playlistName: string) => {
    await page.evaluate((playlistName) => {
        const playlistElements = Array.from(document.querySelectorAll(".GlueDropTarget--playlists"));
        const targetPlaylistElement = playlistElements.find(el => el.textContent === playlistName);
        if (!targetPlaylistElement) {
            throw new Error(`Failed to find playlist with name ${playlistName}`)
        }
        targetPlaylistElement.querySelector("a").click();
    }, playlistName)
    await page.waitForSelector('button[data-testid="play-button"]')
    await page.evaluate(() => document.querySelector('button[data-testid="play-button"]').click())
}

main()
