// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IStrategyAdapter} from "@interfaces/IStrategyAdapter.sol";

abstract contract BaseStrategyAdapter is IStrategyAdapter {
    bytes public parameters;

    function update(bytes calldata _params) public virtual;

    function price(bytes calldata _params) external virtual returns (uint256);

    function supportsInterface(bytes4 interfaceID) external view virtual returns (bool) {
        return interfaceID == type(BaseStrategyAdapter).interfaceId;
    }
}
