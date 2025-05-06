// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Transaction {
    struct PurchaseRecord {
        address buyer;
        address seller;
        uint256 amount;
        uint256 timestamp;
        string orderId;
        bool completed;
    }
    
    mapping(string => PurchaseRecord) public purchases;
    event PurchaseCompleted(string orderId, address buyer, address seller, uint256 amount, uint256 timestamp);
    
    function recordPurchase(string memory _orderId, address _seller) external payable {
        require(msg.value > 0, "Payment amount must be greater than 0");
        require(_seller != address(0), "Invalid seller address");
        
        // Transfer the funds to the seller
        (bool sent, ) = _seller.call{value: msg.value}("");
        require(sent, "Failed to send Ether");
        
        // Record the transaction
        purchases[_orderId] = PurchaseRecord({
            buyer: msg.sender,
            seller: _seller,
            amount: msg.value,
            timestamp: block.timestamp,
            orderId: _orderId,
            completed: true
        });
        
        emit PurchaseCompleted(_orderId, msg.sender, _seller, msg.value, block.timestamp);
    }
    
    function getPurchaseDetails(string memory _orderId) external view returns (
        address buyer,
        address seller,
        uint256 amount,
        uint256 timestamp,
        bool completed
    ) {
        PurchaseRecord memory purchase = purchases[_orderId];
        return (
            purchase.buyer,
            purchase.seller,
            purchase.amount,
            purchase.timestamp,
            purchase.completed
        );
    }
}
