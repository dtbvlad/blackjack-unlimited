/*
 * Blackjack game logic
 *
 * This script implements a simplified version of blackjack. It
 * handles deck creation, shuffling, dealing cards, and basic
 * player/dealer actions (hit/stand). A simple betting system
 * tracks your balance, but unlike real gambling there is no
 * hard limit – you can keep playing even if your balance goes
 * negative. This makes it suitable for unlimited "fake money"
 * games.  The user interface elements referenced in this file
 * come from index.html and styled via styles.css.
 */

// DOM element references
const balanceDisplay = document.getElementById('balance');
const betInput       = document.getElementById('bet');
const dealBtn        = document.getElementById('deal-btn');
const hitBtn         = document.getElementById('hit-btn');
const standBtn       = document.getElementById('stand-btn');
const resetBtn       = document.getElementById('reset-btn');
const messageDiv     = document.getElementById('message');

const dealerCardsDiv = document.getElementById('dealer-cards');
const dealerScoreDiv = document.getElementById('dealer-score');
const playerCardsDiv = document.getElementById('player-cards');
const playerScoreDiv = document.getElementById('player-score');

// Game state variables
let deck = [];
let playerHand = [];
let dealerHand = [];
let balance = 1000;
let currentBet = 0;
let gameInProgress = false;

/**
 * Create a new standard 52‑card deck. Each card is represented
 * as an object with a rank and suit. For display purposes
 * unicode suit characters are used.
 */
function createDeck() {
    const suits = ['\u2660', '\u2665', '\u2666', '\u2663'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const newDeck = [];
    suits.forEach(suit => {
        ranks.forEach(rank => {
            newDeck.push({ rank, suit });
        });
    });
    return newDeck;
}

/**
 * Shuffle an array of cards in place using the Fisher–Yates
 * algorithm. This ensures each permutation of the deck is
 * equally likely.
 */
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Compute the numeric value of a single card. Aces are worth
 * 11 by default but can count as 1 when adjusting totals.
 */
function cardValue(card) {
    if (card.rank === 'A') return 11;
    if (['K', 'Q', 'J'].includes(card.rank)) return 10;
    return parseInt(card.rank, 10);
}

/**
 * Calculate the best score for a hand under blackjack rules.
 * Aces may count as 1 or 11, whichever gets the highest total
 * without busting. The algorithm adds all card values with
 * aces counted high, then reduces by 10 for each ace while
 * busting.
 */
function calculateScore(hand) {
    let total = 0;
    let aces = 0;
    hand.forEach(card => {
        const val = cardValue(card);
        total += val;
        if (card.rank === 'A') aces++;
    });
    // Reduce total by 10 for each ace until total <= 21 or no aces left
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }
    return total;
}

/**
 * Render a hand of cards into its container. Each card is
 * represented by a small div containing rank and suit. When
 * hiding the dealer's first card (during initial deal), pass
 * hideFirst = true.
 */
function displayHand(container, hand, hideFirst = false) {
    container.innerHTML = '';
    hand.forEach((card, index) => {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        if (hideFirst && index === 0) {
            // Hide the dealer's first card
            cardDiv.style.backgroundColor = '#004080';
            cardDiv.style.borderColor = '#004080';
        } else {
            cardDiv.textContent = `${card.rank}${card.suit}`;
        }
        container.appendChild(cardDiv);
    });
}

/**
 * Update the UI displays for the player and dealer scores.
 * When the game is in progress the dealer's score shows only
 * one visible card; otherwise, full totals are shown.
 */
function updateScores() {
    const playerTotal = calculateScore(playerHand);
    playerScoreDiv.textContent = `Score: ${playerTotal}`;
    if (gameInProgress) {
        // Show only the second card for the dealer until the end
        dealerScoreDiv.textContent = `Score: ${cardValue(dealerHand[1])}`;
    } else {
        dealerScoreDiv.textContent = `Score: ${calculateScore(dealerHand)}`;
    }
}

/**
 * Update the displayed balance. Because this is a fake money
 * game, the balance may go negative – there's no restriction on
 * betting beyond your means.
 */
function updateBalance() {
    // Format the balance as a dollar amount. If the number is
    // extremely large or negative, simply display it as-is.
    const prefix = balance < 0 ? '-$' : '$';
    const absVal = Math.abs(balance);
    balanceDisplay.textContent = `Balance: ${prefix}${absVal.toFixed(2)}`;
}

/**
 * Start a new round: take bet, initialize deck, deal two cards
 * each. If the bet is invalid, an error is shown and nothing
 * happens. Note: bets greater than your balance are allowed.
 */
function deal() {
    const betAmount = parseInt(betInput.value, 10);
    if (isNaN(betAmount) || betAmount <= 0) {
        messageDiv.textContent = 'Please enter a valid bet amount.';
        return;
    }
    currentBet = betAmount;
    // Deduct bet from balance, regardless of whether you have enough
    balance -= currentBet;
    updateBalance();
    // Initialize deck and hands
    deck = createDeck();
    shuffle(deck);
    playerHand = [];
    dealerHand = [];
    // Deal two cards each
    playerHand.push(deck.pop());
    dealerHand.push(deck.pop());
    playerHand.push(deck.pop());
    dealerHand.push(deck.pop());
    gameInProgress = true;
    // Update displays
    displayHand(playerCardsDiv, playerHand);
    displayHand(dealerCardsDiv, dealerHand, true);
    updateScores();
    messageDiv.textContent = '';
    // Disable/enable buttons appropriately
    dealBtn.disabled = true;
    hitBtn.disabled = false;
    standBtn.disabled = false;
}

/**
 * Player draws another card. If the player busts, the round
 * ends immediately with a loss.
 */
function hit() {
    if (!gameInProgress) return;
    playerHand.push(deck.pop());
    displayHand(playerCardsDiv, playerHand);
    updateScores();
    const total = calculateScore(playerHand);
    if (total > 21) {
        // Player busts
        endRound('bust');
    }
}

/**
 * Player stands; dealer reveals hidden card and draws until
 * reaching a total of 17 or higher. Then the game outcome is
 * determined.
 */
function stand() {
    if (!gameInProgress) return;
    // Dealer's turn: reveal card
    gameInProgress = false;
    // Reveal hidden card and compute dealer play
    while (calculateScore(dealerHand) < 17) {
        dealerHand.push(deck.pop());
    }
    displayHand(dealerCardsDiv, dealerHand);
    updateScores();
    // Determine outcome
    const playerTotal = calculateScore(playerHand);
    const dealerTotal = calculateScore(dealerHand);
    if (dealerTotal > 21 || playerTotal > dealerTotal) {
        endRound('player');
    } else if (dealerTotal === playerTotal) {
        endRound('push');
    } else {
        endRound('dealer');
    }
}

/**
 * Finish the round. Adjust the balance based on the outcome
 * (player win, push, bust or dealer win). Then reset buttons
 * to allow a new deal.
 */
function endRound(outcome) {
    // Reveal dealer's hand if hidden
    gameInProgress = false;
    displayHand(dealerCardsDiv, dealerHand);
    updateScores();
    switch (outcome) {
        case 'player':
            balance += currentBet * 2;
            messageDiv.textContent = 'You win!';
            break;
        case 'push':
            balance += currentBet; // return bet
            messageDiv.textContent = "It's a push.";
            break;
        case 'bust':
            messageDiv.textContent = 'You busted and lost the hand.';
            break;
        case 'dealer':
        default:
            messageDiv.textContent = 'Dealer wins.';
            break;
    }
    updateBalance();
    // Enable deal button again, disable hit/stand
    dealBtn.disabled = false;
    hitBtn.disabled = true;
    standBtn.disabled = true;
}

/**
 * Reset the entire game state. This sets the balance back to
 * 1000, clears any hands and scores, and enables dealing.
 */
function resetGame() {
    balance = 1000;
    currentBet = 0;
    playerHand = [];
    dealerHand = [];
    gameInProgress = false;
    updateBalance();
    playerCardsDiv.innerHTML = '';
    dealerCardsDiv.innerHTML = '';
    dealerScoreDiv.textContent = '';
    playerScoreDiv.textContent = '';
    messageDiv.textContent = '';
    dealBtn.disabled = false;
    hitBtn.disabled = true;
    standBtn.disabled = true;
}

// Attach event listeners to UI buttons
dealBtn.addEventListener('click', deal);
hitBtn.addEventListener('click', hit);
standBtn.addEventListener('click', stand);
resetBtn.addEventListener('click', resetGame);

// Initialize displayed balance on page load
updateBalance();
