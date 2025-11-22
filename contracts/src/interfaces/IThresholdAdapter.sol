// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IThresholdAdapter {
    function rebalance(bytes calldata _params) external;

    function theresholdReached(bytes calldata _params) external returns (bool);
}
