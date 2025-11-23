// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";

interface ISwapHandler {
    ////////////////////////////////////////////////////
    ////////////////////// Structs /////////////////////
    ////////////////////////////////////////////////////

    /// @notice Individual swap data from TEE
    struct SwapData {
        address sender;
        bool zeroForOne;
        int256 amountSpecified;
        address tokenIn;
        address tokenOut;
    }

    /// @notice Callback data for unlock pattern
    struct CallbackData {
        PoolKey key;
        SwapData[] swaps;
    }

    function postBatch(PoolId poolId, bytes calldata strategyUpdateParams, SwapData[] calldata swaps) external;
}
