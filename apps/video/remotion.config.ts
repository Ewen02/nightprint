import { Config } from "@remotion/cli/config";

// H.264 that X and LinkedIn take as it is: 8-bit 4:2:0, high quality, no audio track needed.
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setColorSpace("bt709");
Config.setCrf(16);
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
