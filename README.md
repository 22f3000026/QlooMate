# 🚀 QlooMate - Your Go-To AI Companion

> Let me introduce QlooMate, your go-to AI companion that makes your daily life more personalized, more engaging, and way more interesting.

[![Next.js](https://img.shields.io/badge/Next.js-15.4.4-black)](https://nextjs.org/)
[![Appwrite](https://img.shields.io/badge/Appwrite-Backend-blue)](https://appwrite.io/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-green)](https://openai.com/)
[![Qloo API](https://img.shields.io/badge/Qloo-Cultural%20Intelligence-orange)](https://qloo.com/)

## 🌟 What Is QlooMate?

QlooMate seamlessly connects with your Gmail using the Gmail API to understand your preferences—without any manual input. It also links with Telegram via your Chat ID, turning your inbox into a smart, taste-driven recommendation hub.

## 🌍 Real-Life Use Cases

### 🎬 Movie Booking Example
You book a ticket for MEGAN 2.0 and get a confirmation email.
QlooMate automatically detects this and uses Qloo's Taste AI to send:
- Similar movie recommendations
- Behind-the-scenes content
- Horror-themed events
➡️ All directly to your Telegram inbox.

### ✈️ Travel Example
You book a flight to New York.
QlooMate fetches that info from your email and sends:
- Curated places to visit
- Hidden food spots
- Local events tailored to your interests

### 🎯 Personalized Daily Suggestions
You select your interests: travel, recipes, quotes, etc.
QlooMate sends you a daily mix of:
- Travel ideas
- Unique recipes
- Inspirational quotes
- Jokes and fun facts
➡️ All powered by Qloo Taste AI.

### 💬 Need Something On the Fly?
Just message QlooMate on Telegram.

Want to chat normally? It uses OpenAI.
Want something based on your taste? It switches to the Qloo Taste API.
It's like having two minds in one assistant.

## 🛠️ How We Built It

We used **Appwrite** as our Backend-as-a-Service platform and **Next.js** for the Frontend.

Set up **6 Cloud Functions** in Appwrite to run scheduled jobs and perform operations along with Gmail API and Telegram Chat ID.

These functions trigger periodically to:
- Check for new emails from users
- Match them against user-selected preferences
- Process data and generate recommendations

## 🎯 QlooTaste – The Magic Engine

At the core of it all is the **QlooTaste function**.

### It works like this:

1. **Takes a Natural Input**
   - Example: "Find me action movies popular with young adults"

2. **Uses OpenAI's GPT-3.5-turbo to extract:**
   - Entity Type: (movie, place, restaurant, etc.)
   - Keywords
   - Categories (genre, theme)
   - Attributes (year, country, location)
   - Signals (demographics, location, trends)

3. **Searches Qloo's Database**
   - Entity Search for matching items
   - Tag & Audience Search for related trends
   - Validation to ensure quality & correct IDs

4. **Data Integration**
   - ID Mapping for all tags, entities, audiences
   - Data Merging and structure building

5. **API Parameter Construction**
   - Converts everything into Qloo API parameters
   - Configures signals and validates everything

6. **Returns Results**
   - Final output is simplified and ready to send via Telegram

**QlooMate is your taste-powered, email-aware, auto-personalizing AI assistant.**
No effort. Just great suggestions—wherever you are. 🔭

## 🚀 Try It Now

Ready to experience QlooMate? Visit our live application:

**[🌐 https://qloomate.appwrite.network/](https://qloomate.appwrite.network/)**

Connect your Gmail, set up Telegram, and start receiving personalized recommendations today!

---

<div align="center">

**Made for Qloo LLM Hackathon**

</div> 