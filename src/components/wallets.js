import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Link } from 'react-feather';
import { selectWallets, selectSeed, selectNetwork, selectReady } from '../store/selectors';
import Modal from './modal';
import NotReady from './notready';

export default function Wallets({ sock }) {
  const seed = useSelector(selectSeed);
  const wallets = useSelector(selectWallets);
  const network = useSelector(selectNetwork);
  const ready = useSelector(selectReady);
  const [isModal, setIsModal] = useState(false);
  const [name, setName] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [recovery, setRecovery] = useState('');
  const [mode, setMode] = useState('');
  const [phase, setPhase] = useState('initial');
  const [words, setWords] = useState([]);

  const resetAll = () => {
    setIsModal(false);
    setName('');
    setPassphrase('');
    setRecovery('');
    setPhase('initial');
  };

  const challengeHandler = () => {
    if (passphrase.length >= 10 && name !== '') {
      setPhase('recovery');
    } else {
      sock.toast({ error: { message: 'Passphrase must be 10 characters or more and name cannot be empty.' } });
    }
  };

  const confirmHandler = () => {
    if (passphrase.length >= 10 && name !== '') {
      if (mode === 'create') {
        sock.send('wallet_create', {
          seed,
          name,
          passphrase,
        });
        resetAll();
      }
      if (mode === 'recover') {
        if (recovery !== '') {
          sock.send('wallet_recover', {
            name,
            seed: recovery,
            passphrase,
          });
          resetAll();
        } else {
          sock.toast({ error: { message: 'You must enter your recovery phrase in order to restore a wallet.' } });
        }
      }
    } else {
      sock.toast({ error: { message: 'Passphrase must be 10 characters or more and name cannot be empty.' } });
    }
  };

  const wordHandler = (e) => {
    if (!e.target.classList.contains('active')) {
      e.target.classList.add('active');
      words.push(e.target.innerText);
      setWords(words);

      if (words.length === seed.split(' ').length) {
        // Pass
        if (words.join(' ') === seed) {
          setPhase('ready');
        // Fail
        } else {
          const elems = document.querySelectorAll('.pp__word');

          for (let i = elems.length; i--;) {
            elems[i].classList.remove('active');
            setWords([]);
          }

          sock.toast({
            error: {
              message: 'You pressed the words in the wrong order, try again.',
            },
          });
        }
      }
    }
  };

  return !ready ? (
    <NotReady network={network} />
  ) : (
    <section className="pp__wallets -ppwrap">
      {!!wallets.length && wallets.map((wallet) => {
        return (
          <div className="pp__wallet pp__bump" key={wallet.id}>
            <NavLink to={`/wallet/${wallet.id}`} className="pp__wallet__link">
              <Link />
              {wallet.name}
            </NavLink>
          </div>
        );
      })}
      <div className="pp__bump">
        <button className="confirm" onClick={() => {
          setMode('create');
          setIsModal(!isModal);
        }}>
          add wallet
        </button>
        <button className="recover" onClick={() => {
          setMode('recover');
          setIsModal(!isModal);
        }}>
          recover wallet
        </button>
      </div>
      {isModal && (
        <Modal
          hideButtons={(phase === 'initial' || phase === 'recovery') && mode !== 'recover'}
          abortHandler={() => resetAll()}
          confirmHandler={confirmHandler}
        >
          <div className="pp__inputs">
            {phase === 'initial' && (
              <>
                <input
                  type="text"
                  name="name"
                  placeholder={`name${mode === 'create' ? ' -- anything' : ''}`}
                  onChange={(e) => setName(e.target.value)}
                  value={name}
                />
                <input
                  type="password"
                  name="passphrase"
                  placeholder={`passphrase${mode === 'create' ? ' -- 10 chars min' : ''}`}
                  onChange={(e) => setPassphrase(e.target.value)}
                  value={passphrase}
                />
              </>
            )}
            {mode === 'create' ? (
              <>
                {phase === 'initial' && (
                  <textarea readOnly value={seed}></textarea>
                )}
                <div className="pp__phrase">
                  {phase === 'initial' && (
                    <>
                      <div>save this recovery phrase in case you ever need to recover your wallet. <br />try not to lose it...</div>
                      <button onClick={challengeHandler} className="confirm">
                        challenge phrase
                      </button>
                    </>
                  )}
                  {phase === 'recovery' && (
                    <>
                      <div>press the words in the correct order to verify your recovery phrase:</div>
                      <div className="pp__words">
                        {seed.split(' ').sort().map((word) => {
                          return (
                            <div className="pp__word" key={word} onClick={wordHandler}>{word}</div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <textarea
                  name="seed"
                  placeholder="enter recovery phrase"
                  onChange={(e) => setRecovery(e.target.value)}
                  value={recovery}
                />
              </>
            )}
            
          </div>
        </Modal>
      )}
    </section>
  );
}