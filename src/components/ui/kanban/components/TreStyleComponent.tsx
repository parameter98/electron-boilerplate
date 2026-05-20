import React, { useState } from "react";
import { Kanban, type BoardData, dropHandler } from "react-kanban-kit";
import { mockData } from "../utils/_mock_";
import { Eye } from "lucide-react";
import {
    addCard,
    addCardPlaceholder,
    getAddCardPlaceholderKey,
    removeCardPlaceholder,
} from "../utils/kanbanUtils";

const TrelloCardAdder: React.FC<{
    columnId: string;
    dataSource: BoardData;
    setDataSource: (dataSource: BoardData) => void;
    inTop: boolean;
}> = ({ columnId, dataSource, setDataSource, inTop }) => {
    const [newCardTitle, setNewCardTitle] = useState("");

    const removeCardPlaceholderHandler = (columnId: string) => {
        setDataSource(removeCardPlaceholder(columnId, dataSource));
    };

    const addCardHandler = (columnId: string, title: string) => {
        if (!title.trim()) return;
        setDataSource(addCard(columnId, dataSource, title, inTop));
    };

    return (
        <div className="trello-example-new-card">
            <input
                type="text"
                onChange={(e) => setNewCardTitle(e.target.value)}
                placeholder="Enter a title for this card..."
                autoFocus
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        addCardHandler(columnId, newCardTitle);
                    } else if (e.key === "Escape") {
                        removeCardPlaceholderHandler(columnId);
                    }
                }}
            />
            <div className="trello-example-new-card-buttons">
                <button onClick={() => addCardHandler(columnId, newCardTitle)}>
                    Add
                </button>
                <button onClick={() => removeCardPlaceholderHandler(columnId)}>
                    Cancel
                </button>
            </div>
        </div>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TrelloCard: React.FC<{ data: any }> = ({ data }) => {
    return (
        <div className="trello-card bg-white rounded-[8px] shadow-[0px_1px_1px_#091e4240,_0px_0px_1px_#091e424f] cursor-pointer overflow-hidden relative no-underline transition-shadow duration-150 ease-in-out hover:outline hover:outline-2 hover:outline-[#0079bf]">
            {/* Cover Image */}
            {data.content?.coverImage && (
                <div className="trello-card-cover rounded-t-[3px] h-[160px] overflow-hidden relative">
                    <img
                        src={data.content.coverImage}
                        alt="Card cover"
                        draggable={false}
                        className="w-full h-full object-cover block"
                    />
                </div>
            )}

            <div className="trello-card-content p-[8px_12px_4px] relative">
                {/* Labels */}
                {data.content?.labels && data.content.labels.length > 0 && (
                    <div className="trello-card-labels flex flex-wrap gap-[4px] mb-[4px] min-h-0">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {data.content.labels.map((label: any, index: number) => (
                            <span
                                key={index}
                                className="trello-card-label rounded-[3px] text-white block text-[12px] font-bold h-[16px] leading-[16px] max-w-[198px] min-w-[40px] overflow-hidden p-[0_8px] relative text-ellipsis whitespace-nowrap hover:max-w-none hover:pr-[8px]"
                                style={{ backgroundColor: label.color }}
                            >
                                {label.name}
                            </span>
                        ))}
                    </div>
                )}

                {/* Title */}
                <div className="trello-card-title text-[#172b4d] text-[14px] font-medium leading-[20px] m-[0_0_4px] break-words">{data.title}</div>

                {/* Activity Indicators */}

                {/* Members */}
                {data.content?.members && data.content.members.length > 0 && (
                    <div className="trello-card-members flex gap-[4px] mt-[8px] items-center flex-wrap">
                        {data.content.members
                            .slice(0, 4)
                            .map((member: string, index: number) => (
                                <div
                                    key={index}
                                    className={`trello-card-member items-center rounded-full text-[#172b4d] flex text-[12px] font-bold h-[28px] justify-center leading-none uppercase w-[28px] border-[2px] border-white -ml-[4px] first:ml-0 ${
                                        index === 0 ? 'bg-[#dfe1e6]' :
                                        index === 1 ? 'bg-[#b3d4fc]' :
                                        index === 2 ? 'bg-[#c7f0db]' :
                                        index === 3 ? 'bg-[#ffd3a5]' :
                                        'bg-[#fd9ca7]'
                                    }`}
                                >
                                    {member
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                </div>
                            ))}
                        {data.content.members.length > 4 && (
                            <div className="trello-card-member-more items-center bg-[#f4f5f7] border border-[#dfe1e6] rounded-full text-[#6b778c] flex text-[11px] font-semibold h-[28px] justify-center w-[28px] -ml-[4px]">
                                +{data.content.members.length - 4}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export const TrelloExample: React.FC = () => {
    const [dataSource, setDataSource] = useState<BoardData>(
        structuredClone(mockData) as BoardData
    );

    const addCardPlaceholderHandler = (
        columnId: string,
        inTop: boolean = true
    ) => {
        setDataSource(addCardPlaceholder(columnId, dataSource, inTop));
    };

    return (
        <div className="trello-example bg-[url('https://d2k1ftgv7pobq7.cloudfront.net/images/backgrounds/gradients/flower.svg')] bg-cover bg-center bg-no-repeat">
            <div className="rkk-demo-page-header">
                <h1>Trello-Style Kanban Board</h1>
                <p>
                    A Trello-inspired board with labels, cover images, and member avatars
                </p>
            </div>

            <div className="rkk-demo-page-content !pb-0">
                <div className="rkk-board pb-[10px]">
                    <Kanban
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        dataSource={dataSource as any}
                        configMap={{
                            card: {
                                render: ({ data }) => <TrelloCard data={data} />,
                                isDraggable: true,
                            },
                            "new-card": {
                                render: ({ column, data }) => (
                                    <TrelloCardAdder
                                        columnId={column.id}
                                        dataSource={dataSource}
                                        setDataSource={setDataSource}
                                        inTop={data?.content?.inTop}
                                    />
                                ),
                                isDraggable: false,
                            },
                        }}
                        columnClassName={() => "trello-example-column !bg-[#ebecf0] !p-[6px] !pr-[2px] !rounded-[12px] shadow-[0px_1px_1px_#091e4240,_0px_0px_1px_#091e424f]"}
                        renderColumnHeader={(column) => (
                            <div className="trello-example-column-header flex items-center justify-between h-[32px] text-[14px] !pr-[8px] font-semibold text-[#172b4d] p-[6px_0_6px_12px]">
                                <span className="flex-1">{column.title}</span>
                                <div className="trello-example-column-header-count">
                                    {column.totalItemsCount || 0}
                                </div>
                                <div className="trello-example-column-header-settings flex items-center justify-center w-[32px] h-[32px] rounded-[3px] cursor-pointer transition-colors duration-200 text-[#6b778c] hover:bg-[#091e4224] hover:text-[#172b4d]">
                                    <Eye size={16} />
                                </div>
                            </div>
                        )}
                        cardsGap={8}
                        virtualization={false}
                        onCardMove={(move) => {
                            setDataSource(
                                dropHandler(
                                    move,
                                    dataSource,
                                    () => { },
                                    (newColumn) => {
                                        return {
                                            ...newColumn,
                                            totalItemsCount: (newColumn.totalItemsCount || 0) + 1,
                                            totalChildrenCount: (newColumn.totalChildrenCount || 0) + 1,
                                        };
                                    },
                                    (sourceColumn) => {
                                        return {
                                            ...sourceColumn,
                                            totalItemsCount: (sourceColumn.totalItemsCount || 0) - 1,
                                            totalChildrenCount:
                                                (sourceColumn.totalChildrenCount || 0) - 1,
                                        };
                                    }
                                )
                            );
                        }}
                        renderListFooter={(column) => {
                            return (
                                <div
                                    className="trello-example-list-footer flex items-center justify-between h-[35px] p-[4px_8px] cursor-pointer rounded-[8px] hover:bg-[#091e4224]"
                                    onClick={() => addCardPlaceholderHandler(column.id, false)}
                                >
                                    <div className="trello-example-list-footer-button text-[#44546f] text-[14px] font-medium leading-[20px]">
                                        + Add card
                                    </div>
                                    <div className="trello-example-list-footer-button">
                                        <svg
                                            width="24"
                                            height="24"
                                            role="presentation"
                                            focusable="false"
                                            viewBox="0 0 24 24"
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="w-[20px] h-[20px] text-[#44546f]"
                                        >
                                            <path
                                                d="M3 6V5C3 3.89543 3.89543 3 5 3H6C6.55228 3 7 3.44772 7 4C7 4.55228 6.55228 5 6 5H5V6C5 6.55228 4.55228 7 4 7C3.44772 7 3 6.55228 3 6Z"
                                                fill="currentColor"
                                            ></path>
                                            <path
                                                fill-rule="evenodd"
                                                clip-rule="evenodd"
                                                d="M6 8C6 6.89543 6.89543 6 8 6H19C20.1046 6 21 6.89543 21 8V18C21 19.1046 20.1046 20 19 20H8C6.89543 20 6 19.1046 6 18V8ZM8 8H19V14H8V8ZM18 18C17.4477 18 17 17.5523 17 17C17 16.4477 17.4477 16 18 16C18.5523 16 19 16.4477 19 17C19 17.5523 18.5523 18 18 18ZM8 17C8 17.5523 8.44772 18 9 18H12C12.5523 18 13 17.5523 13 17C13 16.4477 12.5523 16 12 16H9C8.44772 16 8 16.4477 8 17Z"
                                                fill="currentColor"
                                            ></path>
                                            <path
                                                d="M4 14C3.44772 14 3 14.4477 3 15V16C3 17.1046 3.89543 18 5 18V15C5 14.4477 4.55228 14 4 14Z"
                                                fill="currentColor"
                                            ></path>
                                            <path
                                                d="M3 9C3 8.44772 3.44772 8 4 8C4.55228 8 5 8.44772 5 9V12C5 12.5523 4.55228 13 4 13C3.44772 13 3 12.5523 3 12V9Z"
                                                fill="currentColor"
                                            ></path>
                                            <path
                                                d="M8 4C8 3.44772 8.44772 3 9 3H13C13.5523 3 14 3.44772 14 4C14 4.55228 13.5523 5 13 5H9C8.44772 5 8 4.55228 8 4Z"
                                                fill="currentColor"
                                            ></path>
                                            <path
                                                d="M16 3C15.4477 3 15 3.44772 15 4C15 4.55228 15.4477 5 16 5H19C19 3.89543 18.1046 3 17 3H16Z"
                                                fill="currentColor"
                                            ></path>
                                        </svg>
                                    </div>
                                </div>
                            );
                        }}
                        allowListFooter={(column) => {
                            return !column.children.includes(
                                getAddCardPlaceholderKey(column.id)
                            );
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default TrelloExample;