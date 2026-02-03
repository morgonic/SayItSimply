## Welcome to SayItSimply
SayItSimply is designed to act as an assistive or accessibility tool for three types of users. These user types are the visually impaired, the 54% of adults in the U.S. who read below a sixth grade reading level, and those who speak English as a second language. Using the app, users can take images of real-world text, and receive summaries in plain language, simplified explanations, translate the text into their native language, and even create bulleted lists of action items derived from certain texts, like deadlines and phone numbers to call.

54% of adults in the U.S. read below a sixth grade reading level. This costs the U.S. about $2.2 trillion per year due to low literacy affecting employment and productivity. Additionally, 34% of those adults were born outside the U.S. and speak English as a second language. Finally, as of 2012, 4.2 million adults over 40 in the U.S. have permanent vision impairments and that number is expected to double by 2050. In order to bridge gaps in the ways people with vision impairments, literacy impairments, or language barriers function and understand society around them, it is important to have a versatile accessibility tool that can explain things more simply, read things out loud, or translate things between languages for ESL adults.

## Alpha Features (MVP to be working by 01Feb2026)
- The user will be able to create an account and log in using their email.

- The user will be able to capture or upload a photo of real-world text.

- The user will be able to view text extracted from the image using OCR.

- The user will be able to view the automatically detected language of the text.

- The user will be able to view a generated simplified summary.

- The user will be able to translate text into their preferred language (English or Spanish).

- The user will be able to create a user profile to customize their preferred language and literacy level.

- The user will be able to choose between multiple simplification level choices (standard, simple, extra simple, etc.)

- The user will be able to choose between two explanations occasionally to calibrate easily for simplification level.

- The user will be able to request further simplification of text beyond initial results.

- The user will be able to request definitions for complex words.

## Beta Features (to be working by 01Mar2026)
- The user will be able to view and change settings specific to the app.

- The user will be able to sync their email with Google Oauth (which switches from email/password login to Google OAuth login).

- The user will be able to adjust the app's text size.

- The user will be able to switch the app's theme between light and dark mode.

- The user will be able to listen to audio versions of summaries and explanations on the reader screen, in addition to reading the text.

- The user will be able to view their previously captured or uploaded pictures and submit them through the simplification workflow again.

- The user will be able to see action items based on text extracted in OCR workflow (both in summary and within the action items tab).

- The user will be able to Edit, Delete, and Complete action items that are populated.

- The user will be able to see what language is currently displaying on the reader screen.

## Technologies
- Developer Tools:
   - Visual Studio Code
   - Expo Go

- Content Generation Tools:
   - Coolors.co

- Data Tools:
   - SQLite
   - FastAPI Users

- 3rd Party Dependencies and APIs:
   - Expo SDK v54.0.26
   - React Native v0.82.1
   - FastAPI v0.123.9
   - FastAPI Users v15.0.1
   - Google Cloud Vision API v1
   - Gemini 2.5 Flash API
   - Gemini 2.5 Flash TTS API

## Installation
- Search for SayItSimply in the App Store (Iphone) or the Google Play Store (Android) and download/install the app. Then touch the icon to launch the program

## Development Setup
1. Git, node.js, Python (3.10 or higher), DB Browser, and ngrok (follow the winget commands in the ngrok Microsoft Store page) needs to be installed on the PC used for development
   - 1a. in a web browser, navigate to the ngrok website, then sign up and create an ngrok account and create your URL

2. set up folders and clone dev branch from repo (git clone URL)
   - 2a. on your PC, create a folder (can name it anything, but recommend naming it 'Git'). This folder can be created anywhere, but recommend placing it on the root of the drive (IE: C:\Git or E:\Git).
   - 2b. Navigate to https://github.com/morgonic/SayItSimply and click on the green 'Code' dropdown. With HTTPS tab highlighted, copy the URL
   - 2c. In command prompt, navigate to the newly created folder and run the following command:
```bash
git clone https://github.com/morgonic/SayItSimply.git
```

3. Set up virtual environment
   - 3a. run the following commands:
```bash
   cd .\backend
   python -m venv venv
   .\venv\Scripts\activate.bat
   pip install -r requirements.txt
   npm install
   npm
```

4. Configure .env file
   - 4a. in the root directory of the app, copy .env.example and name it .env
   - 4b. open a command prompt and execute the below command. The IPv4 will be placed in the .env MOBILE_REDIRECT_URL=exp://ip.address.here:8081/--/oauth
```bash
ipconfig
```

   - 4c. copy your ngrok URL and replace the EXPO_PUBLIC_API_URL variable with it. The GOOGLE_REDIRECT_URL will be ngrok.url.here/auth/google/callback
   - 4d. To obtain the GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET variables, open a web browser and navigate to the google cloud console and do the following:
      - i. click on APIs & Services, then click on OAuth consent screen
      - ii. click on Clients, then click on client
      - iii. additional information -> Client ID (copy and paste this into the GOOGLE_OAUTH_CLIENT_ID variable)
      - iv. client secrets -> Client Secret (copy and paste this into the GOOGLE_OAUTH_CLIENT_SECRET variable)

5. Running Backend (FastAPI):
   - 5a. in the command prompt window, ensure you are still in the backend directory, then run the following command:
```bash
ngrok http 8000
```
   - 5b. Open PowerShell, navigate to the same backend directory of the SayItSimply app, then run the following commands:
```bash
.\.venv\Scripts\activate.ps1
uvicorn app.app:app --host 127.0.0.1 --port 8000 --reload
```

6. Running app (via Expo)
   - 6a. open a new command prompt and navigate to the root directory for the SayItSimply app, then run the following commands:

```bash
npm install
npx expo start
```
   - 6b. if screen isn't rendering as expected, stop expo and then run the following command:
```bash
npx expo start -c
```
   - 6c. if expo go app is installed on your phone, scan the QR code and it will open the app, but you can also open a browser and 

## License
- MIT: 2026 Morgon Branning

## Contributors and Maintainers:
- Austin Moses
- Morgon Branning
- Cayden Fischer

## Project Status:
- Beta



## Additional Information (Expo default info starts here and completes this file)
- This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

After starting expo, in the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
