import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { addBet } from '../flux/slices/betPoolSlice';
import { AppState } from '../flux/store';
import { BetCell, BetType, Bet } from '../types.d';

import BetPool from './BetPool';
import BetLayout from './BetLayout';
import BetFormDialog from './BetFormDialog';
import CashInDialog from './CashInDialog';
import RollDialog from './RollDialog';
import LastRolls from './LastRolls';

import './BetPlacer.scss';

const BetPlacer = () => {
  const dispatch = useDispatch();
  const bets: Bet[] = useSelector((state: AppState) => state.betPool.bets);
  const [betFormOpened, setBetFormOpened] = useState(false);
  const [cashInFormOpened, setCashInFormOpened] = useState(false);
  const [betForm, setBetForm] = useState({value: 0, type: BetType.Number, amount: 0, id: ''});
  const balance = useSelector((state: AppState) => state.network.accountBalance);

  const onOpenBetForm = (bet: Bet) => {
    setBetForm(bet);
    setBetFormOpened(true);
  };

  const onOpenCashInForm = () => {
    setCashInFormOpened(true);
  }

  const onCloseBetForm = () => setBetFormOpened(false);
  const onCloseCashInForm = () => setCashInFormOpened(false);

  const handleCellClick = (cell: BetCell) => {
    if(balance > 0) {
      const bet = bets.find(bet => bet.type == cell.type && bet.value == cell.value);
      onOpenBetForm({
        value: cell.value,
        type: cell.type,
        amount: bet ? bet.amount : 0,
        id: '',
      });
    } else {
      onOpenCashInForm();
    }
  };

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
        onBetPlace={(amount: string) => {
          dispatch(addBet({...betForm, amount: Number(amount)}))
          onCloseBetForm();
        }}
        onClose={onCloseBetForm}
      />
      <CashInDialog
        open={cashInFormOpened}
        onClose={onCloseCashInForm}
        onCashIn={(amount: string) => {
          console.log(`Should cash in ${amount}`);
          onCloseCashInForm();
        }}
      />
      <LastRolls />
      <RollDialog />
    </div>
  );
};

export default BetPlacer;
