// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ISwapHandler} from "@interfaces/ISwapHandler.sol";

interface IStrategyAdapter {
    function update(bytes calldata _params) external;

    function price(ISwapHandler.SwapData calldata _swapData) external returns (uint256);

    function parameters() external view returns (bytes memory);
}
