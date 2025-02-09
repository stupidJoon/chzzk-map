import { useState, useEffect, useRef } from 'react';

export function Header({ data }) {
  return (
    <div className='absolute bottom-0 right-0 m-6 flex gap-4 sm:bottom-auto sm:top-0'>
      <AboutDialog data={data} />
      <DarkmodeButton />
    </div>
  );
}

function AboutDialog({ data }) {
  const ref = useRef();

  const onDialogClick = (e) => {
    if (e.target === ref.current) {
      ref.current.close();
    }
  }

  return (
    <>
      <button onClick={() => ref.current.showModal()} className='text-gray-400 underline decoration-dotted'>about</button>
      <dialog onClick={onDialogClick} ref={ref} className='m-auto w-[max(30%,30rem)] rounded-2xl'>
        <div className='p-12 flex flex-col dark:bg-gray-600 dark:text-white'>
          <button onClick={() => ref.current.close()} className='absolute right-0 mr-8'>✖</button>
          <h1 className='text-3xl font-bold'>CHZZK-MAP</h1>
          <h2 className='text-xl text-gray-400'>치지직 스트리머 유사도 지도</h2>
          <div className='flex flex-col gap-4 mt-4'>
            <p>치지직 스트리머 간의 유사도를 그래프로 시각화해서 스트리머간의 관계를 한눈에 볼 수 있습니다.</p>
            <p>유사도는 최근 7일 동안 각 채널에서 채팅한 시청자의 중복 수를 기준으로 계산했습니다.</p>
            <p>시청자수 1000명 이상인 방송 채팅만 집계했으며 연령 제한인 방송은 제외했습니다.</p>
            <p>각 노드는 스트리머를 나타내며, 크기는 팔로워 수에 비례합니다.</p>
            <p>노드를 클릭하면 유사도 상위 10개 채널이 표시되며, 유사도가 20% 이상인 채널은 링크로 연결됩니다.</p>
            <p>데이터는 1시간마다 업데이트되며, 현재 데이터가 업데이트된 시간은 <time dateTime={data?.updateTime} className='font-bold'>{data?.updateTime}</time> 입니다.</p>
            <a href='https://github.com/stupidJoon/chzzk-map' target='_blank' className='flex items-center text-gray-400 underline decoration-dotted'>Github</a>
          </div>
        </div>
      </dialog>
    </>
  )
}

const DarkmodeButton = () => {
  const [dark, setDark] = useState(localStorage.theme === 'dark' || !('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.theme = (dark) ? 'dark' : 'light';
  }, [dark]);

  return (
    <button onClick={() => setDark(!dark)} className='text-4xl'>{(dark) ? '🌑' : '🌕'}</button>
  );
}
