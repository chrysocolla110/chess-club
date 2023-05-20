import { Leopard } from "@picovoice/leopard-node";
import * as recorder from "node-record-lpcm16";
import dotenv from "dotenv";
import fs from "fs";
import Client from "./client";
import { WORD_TO_CHESS_MAP } from "./voice-utils";
import { Hotkey, addKeyHandler } from "./keypress";
import {
    CONFIRM_OPPONENT,
    PHYSICAL_LIST_MOVES,
    PHYSICAL_MAKE_MOVE,
    START_NEW_GAME,
    START_RECORDING,
    STOP_RECORDING,
} from "./events";
dotenv.config();

const FILENAME = "./voice.ogg";

const client = new Client("voice");

addKeyHandler(Hotkey.START_RECORDING, () => {
    recordAudio();
});

addKeyHandler(Hotkey.LIST_MOVES, () => {
    recordAudio(true);
});

addKeyHandler(Hotkey.CONFIRM_OPPONENT, () => {
    client.send(CONFIRM_OPPONENT);
});

addKeyHandler(Hotkey.NEW_GAME, () => {
    client.send(START_NEW_GAME);
});

const recordAudio = (isListingMoves = false) => {
    const file = fs.createWriteStream(FILENAME, { encoding: "binary" });

    const recording = recorder.record({
        sampleRate: 44100,
        device: "Microphone (2- Q9-1)",
        audioType: "ogg",
    });

    recording.stream().pipe(file);
    console.log("Recording...");

    client.send(START_RECORDING);

    setTimeout(() => {
        console.log("Recording stopped");
        recording.stop();
        file.close();
        client.send(STOP_RECORDING);
        processAudio(isListingMoves);
    }, 4000);
};

const accessKey = process.env.PICOVOICE_ACCESS_KEY;
const leopard = new Leopard(accessKey!, {
    modelPath: "models/Chess-leopard-v1.2.0-23-05-17--17-27-47.pv",
});

const processAudio = (isListingMoves = false) => {
    const { transcript, words } = leopard.processFile(FILENAME);
    let move = words
        .map(
            (w) =>
                WORD_TO_CHESS_MAP[w.word.toLowerCase()] || w.word.toLowerCase()
        )
        .join("")
        .replace("88", "a8")
        .replace("aa", "a8");

    if (transcript.trim().toLowerCase() == "queen side castle") {
        move = "O-O-O";
    } else if (transcript.trim().toLowerCase() == "king side castle") {
        move = "O-O";
    }

    console.log(move);
    client.send(
        !isListingMoves ? PHYSICAL_MAKE_MOVE : PHYSICAL_LIST_MOVES,
        move
    );
    fs.unlinkSync(FILENAME);
};
