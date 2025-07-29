import { QlooFilterParams } from "./filter-params.ts";
import { QlooSignalParams } from "./signal-params.ts";
import { QlooOutputParams } from "./output-params.ts";

export type QlooParams = QlooFilterParams & QlooSignalParams & QlooOutputParams;
