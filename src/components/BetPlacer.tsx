import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { addBet } from '../flux/slices/betPoolSlice';
import { AppState } from '../flux/store';
import { BetCell, BetType, Bet } from '../types.d';

import BetPool from './BetPool';
import BetLayout from './BetLayout';
import BetFormDialog from './BetFormDialog';
import RollDialog from './RollDialog';

import './BetPlacer.scss';

const BetPlacer = () => {
  const dispatch = useDispatch();
  const bets: Bet[] = useSelector((state: AppState) => state.betPool.bets);
  const [betFormOpened, setBetFormOpened] = useState(false);
  const [betForm, setBetForm] = useState({value: 0, type: BetType.Number, amount: 0});

  const onOpenBetForm = (bet: Bet) => {
    setBetForm(bet);
    setBetFormOpened(true);
  };

  const onCloseBetForm = () => setBetFormOpened(false);

  const handleCellClick = (cell: BetCell) => {
    const bet = bets.find(bet => bet.type == cell.type && bet.value == cell.value);
    onOpenBetForm({
      value: cell.value,
      type: cell.type,
      amount: bet ? bet.amount : 0,
    });
  };

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => onOpenBetForm({
    ...betForm,
    amount: Number(event.target.value),
  });

  return (
    <div className="BetPlacer">
      <div className="BetPlacer__bet-pool">
        <BetPool />
      </div>
      <div className="BetPlacer__bet-layout">
        <BetLayout onCellClick={handleCellClick} />
      </div>
      <BetFormDialog
        open={betFormOpened}
        bet={betForm}
        onInputChange={handleAmountChange}
        onBetPlace={() => {
          dispatch(addBet({...betForm, amount: Number(betForm.amount)}))
          onCloseBetForm();
        }}
        onClose={onCloseBetForm}
      />
      <RollDialog />
    </div>
  );
};

export default BetPlacer;
