// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IStrategyAdapter} from "@interfaces/IStrategyAdapter.sol";
import {ISwapHandler} from "@interfaces/ISwapHandler.sol";

abstract contract BaseStrategyAdapter is IStrategyAdapter {
    bytes public parameters;

    function update(bytes calldata _params, bytes[] calldata _priceUpdate) external payable virtual;

    function price(ISwapHandler.SwapData calldata _swapData) external virtual returns (uint256);

    function supportsInterface(bytes4 interfaceID) external view virtual returns (bool) {
        return interfaceID == type(BaseStrategyAdapter).interfaceId;
    }
}
