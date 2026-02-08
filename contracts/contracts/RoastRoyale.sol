// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RoastRoyale
 * @notice On-chain record of roast battles and game results for Roast Royale
 * @dev Stores battle results, player stats, and winner declarations
 */
contract RoastRoyale {
    struct Battle {
        address player1;
        address player2;
        address winner;
        uint256 timestamp;
        string battleId;
        uint8 player1Score;
        uint8 player2Score;
        bool completed;
    }

    struct PlayerStats {
        uint256 totalBattles;
        uint256 wins;
        uint256 losses;
        uint256 totalScore;
    }

    // Mapping from battle ID to Battle struct
    mapping(string => Battle) public battles;
    
    // Mapping from player address to their stats
    mapping(address => PlayerStats) public playerStats;
    
    // Array of all battle IDs for enumeration
    string[] public battleIds;
    
    // Events
    event BattleStarted(string indexed battleId, address player1, address player2, uint256 timestamp);
    event BattleCompleted(string indexed battleId, address winner, uint8 player1Score, uint8 player2Score);
    event PlayerRegistered(address indexed player);

    /**
     * @notice Start a new battle between two players
     * @param _battleId Unique identifier for the battle
     * @param _player1 Address of first player
     * @param _player2 Address of second player
     */
    function startBattle(
        string memory _battleId,
        address _player1,
        address _player2
    ) external {
        require(bytes(_battleId).length > 0, "Battle ID cannot be empty");
        require(_player1 != address(0) && _player2 != address(0), "Invalid player addresses");
        require(_player1 != _player2, "Players must be different");
        require(!battles[_battleId].completed && battles[_battleId].player1 == address(0), "Battle already exists");

        battles[_battleId] = Battle({
            player1: _player1,
            player2: _player2,
            winner: address(0),
            timestamp: block.timestamp,
            battleId: _battleId,
            player1Score: 0,
            player2Score: 0,
            completed: false
        });

        battleIds.push(_battleId);

        // Initialize player stats if first battle
        if (playerStats[_player1].totalBattles == 0) {
            emit PlayerRegistered(_player1);
        }
        if (playerStats[_player2].totalBattles == 0) {
            emit PlayerRegistered(_player2);
        }

        emit BattleStarted(_battleId, _player1, _player2, block.timestamp);
    }

    /**
     * @notice Complete a battle and record the winner
     * @param _battleId The battle to complete
     * @param _winner Address of the winning player
     * @param _player1Score Score for player 1
     * @param _player2Score Score for player 2
     */
    function completeBattle(
        string memory _battleId,
        address _winner,
        uint8 _player1Score,
        uint8 _player2Score
    ) external {
        Battle storage battle = battles[_battleId];
        
        require(battle.player1 != address(0), "Battle does not exist");
        require(!battle.completed, "Battle already completed");
        require(_winner == battle.player1 || _winner == battle.player2, "Winner must be a participant");

        battle.winner = _winner;
        battle.player1Score = _player1Score;
        battle.player2Score = _player2Score;
        battle.completed = true;

        // Update player stats
        address loser = _winner == battle.player1 ? battle.player2 : battle.player1;
        
        playerStats[battle.player1].totalBattles++;
        playerStats[battle.player2].totalBattles++;
        playerStats[battle.player1].totalScore += _player1Score;
        playerStats[battle.player2].totalScore += _player2Score;

        playerStats[_winner].wins++;
        playerStats[loser].losses++;

        emit BattleCompleted(_battleId, _winner, _player1Score, _player2Score);
    }

    /**
     * @notice Get battle details
     * @param _battleId The battle ID to query
     * @return Battle struct
     */
    function getBattle(string memory _battleId) external view returns (Battle memory) {
        return battles[_battleId];
    }

    /**
     * @notice Get player statistics
     * @param _player The player address to query
     * @return PlayerStats struct
     */
    function getPlayerStats(address _player) external view returns (PlayerStats memory) {
        return playerStats[_player];
    }

    /**
     * @notice Get total number of battles
     * @return Total battle count
     */
    function getTotalBattles() external view returns (uint256) {
        return battleIds.length;
    }

    /**
     * @notice Get battle ID by index
     * @param _index Index in the battles array
     * @return Battle ID
     */
    function getBattleIdByIndex(uint256 _index) external view returns (string memory) {
        require(_index < battleIds.length, "Index out of bounds");
        return battleIds[_index];
    }
}
