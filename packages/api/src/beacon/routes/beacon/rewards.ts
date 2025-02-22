import {ContainerType} from "@chainsafe/ssz";
import {Epoch, ssz, ValidatorIndex} from "@lodestar/types";

import {
  RoutesData,
  ReturnTypes,
  Schema,
  ReqSerializers,
  ContainerDataExecutionOptimistic,
  ArrayOf,
  WithFinalized,
} from "../../../utils/index.js";
import {HttpStatusCode} from "../../../utils/client/httpStatusCode.js";
import {ApiClientResponse} from "../../../interfaces.js";
import {BlockId} from "./block.js";
import {ValidatorId} from "./state.js";

// See /packages/api/src/routes/index.ts for reasoning and instructions to add new routes

/**
 * True if the response references an unverified execution payload. Optimistic information may be invalidated at
 * a later time. If the field is not present, assume the False value.
 */
export type ExecutionOptimistic = boolean;

/**
 * True if the response references the finalized history of the chain, as determined by fork choice.
 */
export type Finalized = boolean;

/**
 * Rewards info for a single block. Every reward value is in Gwei.
 */
export type BlockRewards = {
  /** Proposer of the block, the proposer index who receives these rewards */
  proposerIndex: ValidatorIndex;
  /** Total block reward, equal to attestations + sync_aggregate + proposer_slashings + attester_slashings */
  total: number;
  /** Block reward component due to included attestations */
  attestations: number;
  /** Block reward component due to included sync_aggregate */
  syncAggregate: number;
  /** Block reward component due to included proposer_slashings */
  proposerSlashings: number;
  /** Block reward component due to included attester_slashings */
  attesterSlashings: number;
};

/**
 * Rewards for a single set of (ideal or actual depending on usage) attestations. Reward value is in Gwei
 */
type AttestationsReward = {
  /** Reward for head vote. Could be negative to indicate penalty */
  head: number;
  /** Reward for target vote. Could be negative to indicate penalty */
  target: number;
  /** Reward for source vote. Could be negative to indicate penalty */
  source: number;
  /** Inclusion delay reward (phase0 only) */
  inclusionDelay: number;
  /** Inactivity penalty. Should be a negative number to indicate penalty */
  inactivity: number;
};

/**
 * Rewards info for ideal attestations ie. Maximum rewards could be earned by making timely head, target and source vote.
 * `effectiveBalance` is in Gwei
 */
export type IdealAttestationsReward = AttestationsReward & {effectiveBalance: number};

/**
 * Rewards info for actual attestations
 */
export type TotalAttestationsReward = AttestationsReward & {validatorIndex: ValidatorIndex};

export type AttestationsRewards = {
  idealRewards: IdealAttestationsReward[];
  totalRewards: TotalAttestationsReward[];
};

/**
 * Rewards info for sync committee participation. Every reward value is in Gwei.
 * Note: In the case that block proposer is present in `SyncCommitteeRewards`, the reward value only reflects rewards for
 * participating in sync committee. Please refer to `BlockRewards.syncAggregate` for rewards of proposer including sync committee
 * outputs into their block
 */
export type SyncCommitteeRewards = {validatorIndex: ValidatorIndex; reward: number}[];

export type Api = {
  /**
   * Get block rewards
   * Returns the info of rewards received by the block proposer
   *
   * @param blockId Block identifier.
   * Can be one of: "head" (canonical head in node's view), "genesis", "finalized", \<slot\>, \<hex encoded blockRoot with 0x prefix\>.
   */
  getBlockRewards(blockId: BlockId): Promise<
    ApiClientResponse<
      {
        [HttpStatusCode.OK]: {
          data: BlockRewards;
          executionOptimistic: ExecutionOptimistic;
          finalized: Finalized;
        };
      },
      HttpStatusCode.BAD_REQUEST | HttpStatusCode.NOT_FOUND
    >
  >;
  /**
   * Get attestations rewards
   * Negative values indicate penalties. `inactivity` can only be either 0 or negative number since it is penalty only
   *
   * @param epoch The epoch to get rewards info from
   * @param validatorIds List of validator indices or pubkeys to filter in
   */
  getAttestationsRewards(
    epoch: Epoch,
    validatorIds?: ValidatorId[]
  ): Promise<
    ApiClientResponse<
      {
        [HttpStatusCode.OK]: {
          data: AttestationsRewards;
          executionOptimistic: ExecutionOptimistic;
          finalized: Finalized;
        };
      },
      HttpStatusCode.BAD_REQUEST | HttpStatusCode.NOT_FOUND
    >
  >;

  /**
   * Get sync committee rewards
   * Returns participant reward value for each sync committee member at the given block.
   *
   * @param blockId Block identifier.
   * Can be one of: "head" (canonical head in node's view), "genesis", "finalized", \<slot\>, \<hex encoded blockRoot with 0x prefix\>.
   * @param validatorIds List of validator indices or pubkeys to filter in
   */
  getSyncCommitteeRewards(
    blockId: BlockId,
    validatorIds?: ValidatorId[]
  ): Promise<
    ApiClientResponse<
      {
        [HttpStatusCode.OK]: {
          data: SyncCommitteeRewards;
          executionOptimistic: ExecutionOptimistic;
          finalized: Finalized;
        };
      },
      HttpStatusCode.BAD_REQUEST | HttpStatusCode.NOT_FOUND
    >
  >;
};

/**
 * Define javascript values for each route
 */
export const routesData: RoutesData<Api> = {
  getBlockRewards: {url: "/eth/v1/beacon/rewards/blocks/{block_id}", method: "GET"},
  getAttestationsRewards: {url: "/eth/v1/beacon/rewards/attestations/{epoch}", method: "POST"},
  getSyncCommitteeRewards: {url: "/eth/v1/beacon/rewards/sync_committee/{block_id}", method: "POST"},
};

export type ReqTypes = {
  /* eslint-disable @typescript-eslint/naming-convention */
  getBlockRewards: {params: {block_id: string}};
  getAttestationsRewards: {params: {epoch: number}; body: ValidatorId[]};
  getSyncCommitteeRewards: {params: {block_id: string}; body: ValidatorId[]};
};

export function getReqSerializers(): ReqSerializers<Api, ReqTypes> {
  return {
    getBlockRewards: {
      writeReq: (block_id) => ({params: {block_id: String(block_id)}}),
      parseReq: ({params}) => [params.block_id],
      schema: {params: {block_id: Schema.StringRequired}},
    },
    getAttestationsRewards: {
      writeReq: (epoch, validatorIds) => ({params: {epoch: epoch}, body: validatorIds || []}),
      parseReq: ({params, body}) => [params.epoch, body],
      schema: {
        params: {epoch: Schema.UintRequired},
        body: Schema.UintOrStringArray,
      },
    },
    getSyncCommitteeRewards: {
      writeReq: (block_id, validatorIds) => ({params: {block_id: String(block_id)}, body: validatorIds || []}),
      parseReq: ({params, body}) => [params.block_id, body],
      schema: {
        params: {block_id: Schema.StringRequired},
        body: Schema.UintOrStringArray,
      },
    },
  };
}

export function getReturnTypes(): ReturnTypes<Api> {
  const BlockRewardsResponse = new ContainerType(
    {
      proposerIndex: ssz.ValidatorIndex,
      total: ssz.UintNum64,
      attestations: ssz.UintNum64,
      syncAggregate: ssz.UintNum64,
      proposerSlashings: ssz.UintNum64,
      attesterSlashings: ssz.UintNum64,
    },
    {jsonCase: "eth2"}
  );

  const IdealAttestationsRewardsResponse = new ContainerType(
    {
      head: ssz.UintNum64,
      target: ssz.UintNum64,
      source: ssz.UintNum64,
      inclusionDelay: ssz.UintNum64,
      inactivity: ssz.UintNum64,
      effectiveBalance: ssz.UintNum64,
    },
    {jsonCase: "eth2"}
  );

  const TotalAttestationsRewardsResponse = new ContainerType(
    {
      head: ssz.UintNum64,
      target: ssz.UintNum64,
      source: ssz.UintNum64,
      inclusionDelay: ssz.UintNum64,
      inactivity: ssz.UintNum64,
      validatorIndex: ssz.ValidatorIndex,
    },
    {jsonCase: "eth2"}
  );

  const AttestationsRewardsResponse = new ContainerType(
    {
      idealRewards: ArrayOf(IdealAttestationsRewardsResponse),
      totalRewards: ArrayOf(TotalAttestationsRewardsResponse),
    },
    {jsonCase: "eth2"}
  );

  const SyncCommitteeRewardsResponse = new ContainerType(
    {
      validatorIndex: ssz.ValidatorIndex,
      reward: ssz.UintNum64,
    },
    {jsonCase: "eth2"}
  );

  return {
    getBlockRewards: WithFinalized(ContainerDataExecutionOptimistic(BlockRewardsResponse)),
    getAttestationsRewards: WithFinalized(ContainerDataExecutionOptimistic(AttestationsRewardsResponse)),
    getSyncCommitteeRewards: WithFinalized(ContainerDataExecutionOptimistic(ArrayOf(SyncCommitteeRewardsResponse))),
  };
}
