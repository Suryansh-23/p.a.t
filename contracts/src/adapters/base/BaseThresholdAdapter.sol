// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

abstract contract BaseThresholdAdapter {
    function theresholdReached(bytes calldata _params) external virtual returns (bool);

    function supportsInterface(bytes4 interfaceID) external view virtual returns (bool) {
        return interfaceID == type(BaseThresholdAdapter).interfaceId;
    }
}
