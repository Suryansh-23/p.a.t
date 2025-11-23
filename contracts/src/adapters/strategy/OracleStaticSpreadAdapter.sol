// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {BaseStrategyAdapter} from "@adapters/base/BaseStrategyAdapter.sol";
import {PythStructs} from "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import {IPyth} from "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import {ISwapHandler} from "@interfaces/ISwapHandler.sol";

/// @title OracleStaticSpreadAdapter
/// @notice Strategy adapter using Pyth oracle with static bid/ask spread
/// @dev Implements market maker pricing: bid price (lower) and ask price (higher)
contract OracleStaticSpreadAdapter is BaseStrategyAdapter {
    /// @notice Pyth oracle contract
    IPyth public immutable pyth;

    ISwapHandler public immutable swapHandler;

    /// @notice Pyth price feed ID for the token pair
    bytes32 public immutable priceFeedId;

    bool public immutable zeroForOnePriceFeed;

    /// @notice Basis points denominator
    uint256 private constant BPS_DENOMINATOR = 1e4;

    error OracleStaticSpreadAdapter__StalePrice();
    error OracleStaticSpreadAdapter__Unauthorized();

    event ParametersUpdated(uint256 indexed oraclePrice);

    /// @param pythContract Address of Pyth oracle contract
    /// @param _priceFeedId Pyth price feed ID for this token pair
    /// @param _zeroForOne true if the price feed gives price of token0 in terms of token1
    constructor(address pythContract, bytes32 _priceFeedId, bool _zeroForOne, address _swapHandler) {
        pyth = IPyth(pythContract);
        priceFeedId = _priceFeedId;
        zeroForOnePriceFeed = _zeroForOne;
        swapHandler = ISwapHandler(_swapHandler);
    }

    /// @notice Calculate price based on oracle and spread
    /// @param _swapData Encoded (bool zeroForOne, uint256 swapAmount)
    /// @dev zeroForOne = true: user sells token0, buys token1 → pays ASK price (higher)
    /// @dev zeroForOne = false: user sells token1, buys token0 → receives BID price (lower)
    /// @return finalPrice Price scaled by 1e18
    function price(ISwapHandler.SwapData calldata _swapData) external override returns (uint256 finalPrice) {
        (, uint256 bidPrice, uint256 askPrice) = getBidAskPrices();

        // Calculate bid/ask based on swap direction
        if (_swapData.zeroForOne) {
            // price of token0
            if (zeroForOnePriceFeed) {
                // ask price
                finalPrice = askPrice;
            } else {
                // bid price
                finalPrice = bidPrice;
            }
        } else {
            if (zeroForOnePriceFeed) {
                // bid price
                finalPrice = bidPrice;
            } else {
                // ask price
                finalPrice = askPrice;
            }
        }
    }

    /// @notice Update the spread parameter
    /// @param _params Encoded uint256 spreadBps
    function update(bytes calldata _params, bytes[] calldata _priceUpdate) public payable override {
        if (msg.sender != address(swapHandler)) revert OracleStaticSpreadAdapter__Unauthorized();
        parameters = _params;

        uint256 fee = pyth.getUpdateFee(_priceUpdate);
        pyth.updatePriceFeeds{value: fee}(_priceUpdate);

        (uint256 oraclePrice,,) = getBidAskPrices();

        emit ParametersUpdated(oraclePrice);
    }

    function getCurrentSpread() external view returns (uint256 spreadBps) {
        spreadBps = abi.decode(parameters, (uint256));
    }

    function getBidAskPrices() public view returns (uint256 oraclePrice, uint256 bidPrice, uint256 askPrice) {
        PythStructs.Price memory pythPrice = pyth.getPriceNoOlderThan(priceFeedId, 60);
        oraclePrice = _convertPythPrice(pythPrice);

        uint256 spreadBps = abi.decode(parameters, (uint256));

        askPrice = oraclePrice - oraclePrice * (spreadBps / 2) / BPS_DENOMINATOR;
        bidPrice = oraclePrice + oraclePrice * (spreadBps / 2) / BPS_DENOMINATOR;
    }

    /// @notice Convert Pyth price to 1e18 scale
    /// @param pythPrice Pyth price struct
    /// @return price_ Price scaled to 1e18 (divide by 1e18 to get actual price)
    function _convertPythPrice(PythStructs.Price memory pythPrice) internal pure returns (uint256 price_) {
        // Get absolute value of price
        uint256 priceAbs = uint256(uint64(pythPrice.price > 0 ? pythPrice.price : -pythPrice.price));
        int32 expo = pythPrice.expo;

        int256 targetExpo = int256(expo) + 18;

        price_ = priceAbs * (10 ** uint256(targetExpo));

        // Sanity check - price must be non-zero
        if (price_ == 0) revert OracleStaticSpreadAdapter__StalePrice();
    }
}
