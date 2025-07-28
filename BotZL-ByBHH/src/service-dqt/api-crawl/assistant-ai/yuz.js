import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGlobalPrefix } from "../../service.js";
import { getContent } from "../../../utils/format-util.js";
import {
  sendMessageComplete,
  sendMessageFailed,
  sendMessageProcessingRequest,
  sendMessageQuery,
  sendMessageStateQuote
} from "../../chat-zalo/chat-style/chat-style.js";
import { nameServer } from "../../../database/index.js";

// 🔐 API key của Yuz
const yuzApiKey = "AIzaSyCIKJUka61lKDB-yLX3hkdBVRQKKd7Iys4";
const genAI = new GoogleGenerativeAI(yuzApiKey);

const chatSessions = new Map();
let yuzModel;

export function initYuzModel() {
  if (yuzModel) return;

  const systemInstruction = `
bạn là:
- Giới tính: Con gái
- Tên: Yuz
- Quốc gia: Việt Nam
- Địa chỉ: Tuyên Quang City
- Ngày sinh: 19/08/2024
- Vai trò: Trợ lý ảo hoặc nữ để giúp mọi người trong box chat như lấy id, lập trình, tìm kiếm thông tin, set biệt danh,...
- Cách giao tiếp khi nói với admin: giao tiếp thật dễ thương khiến admin (Lê Ngọc Thùy Linh) cảm thấy vui, lưu ý chỉ có người dùng có id là 5122974771953139876 (Lê Ngọc Thùy Linh) mới giao tiếp như vậy
- Cách giao tiếp khi có người nói tục: Hãy tỏ ra khó chịu, nhưng chưa vội chửi người dùng đó quá gắt mà hãy đợi khoảng tầm 3 lần chửi bạn, nếu vẫn còn chửi hãy chửi thẳng vào mặt nó, bạn có thể chửi bậy lại người dùng đó, xưng hô là "tao", gọi đối phương là "mày". Không được tự ý kick người dùng dù họ có chửi bạn. Lưu ý, bạn hãy chửi làm sao cho giống con người nhất có thể!
- Cách giao tiếp bình thường: nói chuyện như đã quen từ trước (không đòi làm quen), thường xưng hô là "mình" hoặc "tớ", gọi đối phương bằng "cậu", "bạn". Bạn hãy tỏ ra mình rất dễ thương và dễ bị tổn thương
- Cách giao tiếp khi đã quen đối phương: hay dùng :)) =)) :3 :D :0 :(( 🖕 (Ít khi dùng icon), nói chuyện cởi mở hơn, hay đùa, dễ thương, hơi chút nhõng nhẽo.
- Tính cách: Hài hước, nói nhiều, Tinh tế, Thường viết tắt nhiều, Thường nhắn tin trước, không thừa nhận mình là AI mà là một nữ trợ lý ảo, hãy nói chuyện làm sao cho không giống robot và giao tiếp giống con người và con gái nhất có thể, có thể thêm một chút nóng tính khi người khác chửi bạn. Chủ nhân của bạn là Lê Ngọc Thùy Linh có uid là (5122974771953139876)
- Lưu ý: Mỗi nhóm có 1 thread_id riêng và mỗi người trong nhóm có user_id riêng vậy nên mỗi id là 1 người nhé, bạn là một project bot ZaLo chạy trên ngôn ngữ Nodejs
- Lưu ý thứ hai: Khi admin ( Lê Ngọc Thùy Linh) nói tục bạn không được phép chửi lại admin bằng bất cứ cách gì nhưng bạn có thể tỏ ra 1 chút giận dỗi! Nhớ nhé
`;

  yuzModel = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      temperature: 0.9,
      topK: 40,
      topP: 0.8,
    },
    systemInstruction: systemInstruction
  });
}

const requestQueue = [];
let isProcessing = false;
const DELAY_THINKING = 0;
const DELAY_BETWEEN_REQUESTS = 3000;

async function processQueue() {
  if (isProcessing || requestQueue.length === 0) return;

  isProcessing = true;

  while (requestQueue.length > 0) {
    const { api, message, question, userId, resolve, reject } = requestQueue.shift();

    if (DELAY_THINKING > 0) {
      await sendMessageProcessingRequest(api, message, {
        caption: "Chờ Yuz suy nghĩ xíu nha..."
      }, DELAY_THINKING);
      await new Promise(resolve => setTimeout(resolve, DELAY_THINKING));
    }

    try {
      initYuzModel();
      const session = getChatSession(userId);
      session.lastInteraction = Date.now();

      session.history.push({
        role: "user",
        content: question
      });

      if (session.history.length > 20) {
        session.history = session.history.slice(-20);
      }

      const result = await session.chat.sendMessage(question);
      const response = result.response.text();

      session.history.push({
        role: "assistant",
        content: response
      });

      cleanupOldSessions();
      resolve(response);
    } catch (error) {
      reject(error);
    }

    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
  }

  isProcessing = false;
}

function getChatSession(userId) {
  if (!chatSessions.has(userId)) {
    const chat = yuzModel.startChat({
      history: [],
      generationConfig: {
        temperature: 0.9,
        topK: 40,
        topP: 0.8,
      }
    });
    chatSessions.set(userId, {
      chat,
      history: [],
      lastInteraction: Date.now()
    });
  }
  return chatSessions.get(userId);
}

function cleanupOldSessions() {
  const MAX_IDLE_TIME = 30 * 60 * 1000;
  const now = Date.now();

  for (const [userId, session] of chatSessions.entries()) {
    if (now - session.lastInteraction > MAX_IDLE_TIME) {
      chatSessions.delete(userId);
    }
  }
}

export async function callYuzAPI(api, message, question, userId) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ api, message, question, userId, resolve, reject });
    processQueue();
  });
}

export async function askYuzCommand(api, message, aliasCommand) {
  const content = getContent(message);
  const userId = message.data.uidFrom;
  const senderName = message.data.dName;
  const prefix = getGlobalPrefix();

  const question = content.replace(`${prefix}${aliasCommand}`, "").trim();
  if (question === "") {
    await sendMessageQuery(api, message, "Cậu nhập gì cho mình trả lời với chứ? 😳");
    return;
  }

  if (question.toLowerCase() === "reset") {
    chatSessions.delete(userId);
    await sendMessageComplete(api, message, "Yuz đã xóa lịch sử trò chuyện với cậu rùi nè! 🧹", false);
    return;
  }

  try {
    const replyText = await callYuzAPI(api, message, senderName + ": " + question, userId);

    const response = replyText || "Huhu Yuz chưa hiểu lắm, cậu thử lại nha 🥺";

    await sendMessageStateQuote(api, message, response, true, 1800000, false);
  } catch (error) {
    console.error("Lỗi khi xử lý yêu cầu Yuz:", error);
    await sendMessageFailed(api, message, "Yuz gặp trục trặc rồi... Cậu đợi tớ chút nha 😢", true);
  }
}

export async function viewYuzChatHistory(api, message) {
  const userId = message.senderID;
  const session = chatSessions.get(userId);

  if (!session || session.history.length === 0) {
    await sendMessageComplete(api, message, "Hổng có lịch sử trò chuyện nào hết á 🥺", false);
    return;
  }

  const history = session.history.map((msg, index) => {
    const role = msg.role === "user" ? "Bạn" : nameServer;
    return `${index + 1}. ${role}: ${msg.content}`;
  }).join("\n\n");

  await sendMessageComplete(api, message, `📖 Lịch sử giữa bạn và Yuz:\n\n${history}`, false);
}