import {ApiError} from "@lodestar/api";
import {BeaconStateAllForks, isExecutionStateType, isMergeTransitionComplete} from "@lodestar/state-transition";
import {AssertionResult, Assertion} from "../interfaces.js";
import {neverMatcher} from "./matchers.js";

export const mergeAssertion: Assertion<"merge", string> = {
  id: "merge",
  // Include into particular test with custom condition
  match: neverMatcher,
  async assert({node}) {
    const errors: AssertionResult[] = [];

    const res = await node.beacon.api.debug.getStateV2("head");
    ApiError.assert(res);
    const state = res.response.data as unknown as BeaconStateAllForks;

    if (!(isExecutionStateType(state) && isMergeTransitionComplete(state))) {
      errors.push("Node has not yet completed the merged transition");
    }

    return errors;
  },
};
