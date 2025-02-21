import {toHexString} from "@chainsafe/ssz";
import {ForkName} from "@lodestar/params";
import {ssz, Slot, allForks} from "@lodestar/types";
import {
  Api,
  BlockHeaderResponse,
  BroadcastValidation,
  ValidatorResponse,
} from "../../../../src/beacon/routes/beacon/index.js";
import {GenericServerTestCases} from "../../../utils/genericServerTest.js";

const root = new Uint8Array(32).fill(1);
const randao = new Uint8Array(32).fill(1);
const balance = 32e9;
const reward = 32e9;
const pubkeyHex = toHexString(Buffer.alloc(48, 1));

const blockHeaderResponse: BlockHeaderResponse = {
  root,
  canonical: true,
  header: ssz.phase0.SignedBeaconBlockHeader.defaultValue(),
};

const validatorResponse: ValidatorResponse = {
  index: 1,
  balance,
  status: "active_ongoing",
  validator: ssz.phase0.Validator.defaultValue(),
};

export const testData: GenericServerTestCases<Api> = {
  // block

  getBlock: {
    args: ["head", "json"],
    res: {data: ssz.phase0.SignedBeaconBlock.defaultValue()},
  },
  getBlockV2: {
    args: ["head", "json"],
    res: {
      executionOptimistic: true,
      finalized: false,
      data: ssz.bellatrix.SignedBeaconBlock.defaultValue(),
      version: ForkName.bellatrix,
    },
  },
  getBlockAttestations: {
    args: ["head"],
    res: {executionOptimistic: true, finalized: false, data: [ssz.phase0.Attestation.defaultValue()]},
  },
  getBlockHeader: {
    args: ["head"],
    res: {executionOptimistic: true, finalized: false, data: blockHeaderResponse},
  },
  getBlockHeaders: {
    args: [{slot: 1, parentRoot: toHexString(root)}],
    res: {executionOptimistic: true, finalized: false, data: [blockHeaderResponse]},
  },
  getBlockRoot: {
    args: ["head"],
    res: {executionOptimistic: true, finalized: false, data: {root}},
  },
  publishBlock: {
    args: [ssz.phase0.SignedBeaconBlock.defaultValue()],
    res: undefined,
  },
  publishBlockV2: {
    args: [ssz.phase0.SignedBeaconBlock.defaultValue(), {broadcastValidation: BroadcastValidation.consensus}],
    res: undefined,
  },
  publishBlindedBlock: {
    args: [getDefaultBlindedBlock(64)],
    res: undefined,
  },
  publishBlindedBlockV2: {
    args: [getDefaultBlindedBlock(64), {broadcastValidation: BroadcastValidation.consensus}],
    res: undefined,
  },
  getBlobSidecars: {
    args: ["head", [0]],
    res: {executionOptimistic: true, finalized: false, data: ssz.deneb.BlobSidecars.defaultValue()},
  },

  // pool

  getPoolAttestations: {
    args: [{slot: 1, committeeIndex: 2}],
    res: {data: [ssz.phase0.Attestation.defaultValue()]},
  },
  getPoolAttesterSlashings: {
    args: [],
    res: {data: [ssz.phase0.AttesterSlashing.defaultValue()]},
  },
  getPoolProposerSlashings: {
    args: [],
    res: {data: [ssz.phase0.ProposerSlashing.defaultValue()]},
  },
  getPoolVoluntaryExits: {
    args: [],
    res: {data: [ssz.phase0.SignedVoluntaryExit.defaultValue()]},
  },
  getPoolBlsToExecutionChanges: {
    args: [],
    res: {data: [ssz.capella.SignedBLSToExecutionChange.defaultValue()]},
  },
  submitPoolAttestations: {
    args: [[ssz.phase0.Attestation.defaultValue()]],
    res: undefined,
  },
  submitPoolAttesterSlashings: {
    args: [ssz.phase0.AttesterSlashing.defaultValue()],
    res: undefined,
  },
  submitPoolProposerSlashings: {
    args: [ssz.phase0.ProposerSlashing.defaultValue()],
    res: undefined,
  },
  submitPoolVoluntaryExit: {
    args: [ssz.phase0.SignedVoluntaryExit.defaultValue()],
    res: undefined,
  },
  submitPoolBlsToExecutionChange: {
    args: [[ssz.capella.SignedBLSToExecutionChange.defaultValue()]],
    res: undefined,
  },
  submitPoolSyncCommitteeSignatures: {
    args: [[ssz.altair.SyncCommitteeMessage.defaultValue()]],
    res: undefined,
  },

  // state

  getStateRoot: {
    args: ["head"],
    res: {executionOptimistic: true, finalized: false, data: {root}},
  },
  getStateFork: {
    args: ["head"],
    res: {executionOptimistic: true, finalized: false, data: ssz.phase0.Fork.defaultValue()},
  },
  getStateRandao: {
    args: ["head", 1],
    res: {executionOptimistic: true, finalized: false, data: {randao}},
  },
  getStateFinalityCheckpoints: {
    args: ["head"],
    res: {
      executionOptimistic: true,
      finalized: false,
      data: {
        previousJustified: ssz.phase0.Checkpoint.defaultValue(),
        currentJustified: ssz.phase0.Checkpoint.defaultValue(),
        finalized: ssz.phase0.Checkpoint.defaultValue(),
      },
    },
  },
  getStateValidators: {
    args: ["head", {id: [pubkeyHex, "1300"], status: ["active_ongoing"]}],
    res: {executionOptimistic: true, finalized: false, data: [validatorResponse]},
  },
  postStateValidators: {
    args: ["head", {id: [pubkeyHex, 1300], status: ["active_ongoing"]}],
    res: {executionOptimistic: true, finalized: false, data: [validatorResponse]},
  },
  getStateValidator: {
    args: ["head", pubkeyHex],
    res: {executionOptimistic: true, finalized: false, data: validatorResponse},
  },
  getStateValidatorBalances: {
    args: ["head", ["1300"]],
    res: {executionOptimistic: true, finalized: false, data: [{index: 1300, balance}]},
  },
  postStateValidatorBalances: {
    args: ["head", [1300]],
    res: {executionOptimistic: true, finalized: false, data: [{index: 1300, balance}]},
  },
  getEpochCommittees: {
    args: ["head", {index: 1, slot: 2, epoch: 3}],
    res: {executionOptimistic: true, finalized: false, data: [{index: 1, slot: 2, validators: [1300]}]},
  },
  getEpochSyncCommittees: {
    args: ["head", 1],
    res: {executionOptimistic: true, finalized: false, data: {validators: [1300], validatorAggregates: [[1300]]}},
  },

  // reward

  getBlockRewards: {
    args: ["head"],
    res: {
      executionOptimistic: true,
      finalized: false,
      data: {
        proposerIndex: 0,
        total: 15,
        attestations: 8,
        syncAggregate: 4,
        proposerSlashings: 2,
        attesterSlashings: 1,
      },
    },
  },
  getSyncCommitteeRewards: {
    args: ["head", ["1300"]],
    res: {executionOptimistic: true, finalized: false, data: [{validatorIndex: 1300, reward}]},
  },

  getAttestationsRewards: {
    args: [10, ["1300"]],
    res: {
      executionOptimistic: true,
      finalized: false,
      data: {
        idealRewards: [
          {
            head: 0,
            target: 10,
            source: 20,
            inclusionDelay: 30,
            inactivity: 40,
            effectiveBalance: 50,
          },
        ],
        totalRewards: [
          {
            head: 0,
            target: 10,
            source: 20,
            inclusionDelay: 30,
            inactivity: 40,
            validatorIndex: 50,
          },
        ],
      },
    },
  },

  // -

  getGenesis: {
    args: [],
    res: {data: ssz.phase0.Genesis.defaultValue()},
  },
};

function getDefaultBlindedBlock(slot: Slot): allForks.SignedBlindedBeaconBlock {
  const block = ssz.bellatrix.SignedBlindedBeaconBlock.defaultValue();
  block.message.slot = slot;
  return block;
}
